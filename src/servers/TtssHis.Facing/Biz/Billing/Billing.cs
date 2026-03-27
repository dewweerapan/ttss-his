// src/servers/TtssHis.Facing/Biz/Billing/Billing.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Billing;

namespace TtssHis.Facing.Biz.Billing;

[ApiController]
[Authorize]
public sealed class Billing(HisDbContext db) : ControllerBase
{
    // ── BILLING WORKLIST ──────────────────────────────────────────────────
    /// <summary>GET /api/billing — today's encounters for billing</summary>
    [HttpGet("api/billing")]
    public ActionResult<IEnumerable<BillingEncounterItem>> List(
        [FromQuery] string? date = null)
    {
        var targetDate = date is not null
            ? DateOnly.Parse(date)
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var items = db.Encounters
            .Where(e => e.IsActive && e.DeletedDate == null
                && DateOnly.FromDateTime(e.AdmissionDate) == targetDate)
            .Select(e => new BillingEncounterItem(
                e.Id,
                e.EncounterNo,
                e.Patient!.Hn,
                (e.Patient.PreName ?? "") + e.Patient.FirstName + " " + e.Patient.LastName,
                e.AdmissionDate,
                e.Invoice != null ? e.Invoice.Status : (int?)null,
                e.Invoice != null ? e.Invoice.InvoiceNo : null,
                e.Invoice != null ? e.Invoice.TotalAmount : (decimal?)null
            ))
            .OrderBy(e => e.AdmissionDate)
            .ToList();

        return Ok(items);
    }

    // ── GET INVOICE ───────────────────────────────────────────────────────
    /// <summary>GET /api/encounters/{id}/invoice</summary>
    [HttpGet("api/encounters/{encounterId}/invoice")]
    public async Task<ActionResult<InvoiceDto>> GetInvoice(string encounterId)
    {
        var invoice = await db.Invoices
            .Include(i => i.Items).ThenInclude(item => item.Product)
            .Include(i => i.Receipt)
            .FirstOrDefaultAsync(i => i.EncounterId == encounterId);

        if (invoice is null) return NotFound();
        return Ok(ToDto(invoice));
    }

    // ── CREATE INVOICE ────────────────────────────────────────────────────
    /// <summary>POST /api/encounters/{id}/invoice — generate invoice from DISPENSED drug orders</summary>
    [HttpPost("api/encounters/{encounterId}/invoice")]
    public async Task<ActionResult<InvoiceDto>> CreateInvoice(string encounterId)
    {
        var encounter = await db.Encounters
            .Include(e => e.DrugOrders).ThenInclude(o => o.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);

        if (encounter is null) return NotFound("Encounter not found.");

        var existingInvoice = await db.Invoices.FirstOrDefaultAsync(i => i.EncounterId == encounterId);
        if (existingInvoice is not null && existingInvoice.Status != 9)
            return BadRequest("An invoice already exists for this encounter.");

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var invCount = db.Invoices.Count(i => i.InvoiceNo.StartsWith("INV" + today));
        var invoiceNo = $"INV{today}{(invCount + 1):D5}";
        var invoiceId = Guid.NewGuid().ToString();

        var invoiceItems = new List<InvoiceItem>();

        // OPD consultation fee
        var opdFeeProduct = await db.Products.FirstOrDefaultAsync(p => p.Code == "OPD_FEE");
        if (opdFeeProduct is not null)
        {
            var opdFeePrice = await db.Pricings
                .Where(p => p.ProductId == opdFeeProduct.Id && p.IsActive && p.DeletedDate == null)
                .Select(p => p.PriceNormal)
                .FirstOrDefaultAsync();

            invoiceItems.Add(new InvoiceItem
            {
                Id          = Guid.NewGuid().ToString(),
                InvoiceId   = invoiceId,
                ProductId   = opdFeeProduct.Id,
                Description = opdFeeProduct.Name,
                Quantity    = 1,
                UnitPrice   = opdFeePrice,
                TotalPrice  = opdFeePrice,
            });
        }

        // Drug order items from DISPENSED orders
        foreach (var order in encounter.DrugOrders.Where(o => o.Status == 3))
        {
            foreach (var item in order.Items)
            {
                var price = item.Product is not null
                    ? await db.Pricings
                        .Where(p => p.ProductId == item.ProductId && p.IsActive && p.DeletedDate == null)
                        .Select(p => p.PriceNormal)
                        .FirstOrDefaultAsync()
                    : 0m;

                var total = price * item.Quantity;

                invoiceItems.Add(new InvoiceItem
                {
                    Id              = Guid.NewGuid().ToString(),
                    InvoiceId       = invoiceId,
                    ProductId       = item.ProductId,
                    DrugOrderItemId = item.Id,
                    Description     = $"{item.Product?.Name ?? item.ProductId} ({item.Quantity} {item.Unit ?? item.Product?.Unit})",
                    Quantity        = item.Quantity,
                    UnitPrice       = price,
                    TotalPrice      = total,
                });
            }
        }

        var invoice = new Invoice
        {
            Id          = invoiceId,
            InvoiceNo   = invoiceNo,
            EncounterId = encounterId,
            Status      = 1, // PENDING
            TotalAmount = invoiceItems.Sum(i => i.TotalPrice),
            IssuedAt    = DateTime.UtcNow,
            Items       = invoiceItems,
        };
        db.Invoices.Add(invoice);
        await db.SaveChangesAsync();

        var created = await db.Invoices
            .Include(i => i.Items).ThenInclude(x => x.Product)
            .Include(i => i.Receipt)
            .FirstAsync(i => i.Id == invoice.Id);

        return CreatedAtAction(nameof(GetInvoice), new { encounterId }, ToDto(created));
    }

    // ── PAY ───────────────────────────────────────────────────────────────
    /// <summary>POST /api/invoices/{id}/pay</summary>
    [HttpPost("api/invoices/{id}/pay")]
    public async Task<ActionResult<ReceiptDto>> Pay(string id, [FromBody] PayRequest req)
    {
        var invoice = await db.Invoices
            .Include(i => i.Receipt)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null) return NotFound();
        if (invoice.Status == 2) return BadRequest("Invoice is already paid.");
        if (invoice.Status == 9) return BadRequest("Invoice is canceled.");
        if (invoice.Receipt is not null) return BadRequest("Payment already recorded.");

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var rcCount = db.Receipts.Count(r => r.ReceiptNo.StartsWith("RC" + today));
        var receiptNo = $"RC{today}{(rcCount + 1):D5}";

        var receipt = new Receipt
        {
            Id            = Guid.NewGuid().ToString(),
            ReceiptNo     = receiptNo,
            InvoiceId     = id,
            PaymentMethod = req.PaymentMethod ?? 1,
            Amount        = req.Amount,
            PaidAt        = DateTime.UtcNow,
        };
        db.Receipts.Add(receipt);

        invoice.Status = 2; // PAID
        invoice.PaidAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Ok(new ReceiptDto(receipt.Id, receipt.ReceiptNo, receipt.PaymentMethod, receipt.Amount, receipt.PaidAt));
    }

    // ── CANCEL INVOICE ────────────────────────────────────────────────────
    [HttpDelete("api/invoices/{id}")]
    public async Task<IActionResult> CancelInvoice(string id)
    {
        var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return NotFound();
        if (invoice.Status == 2) return BadRequest("Cannot cancel a paid invoice.");

        invoice.Status = 9; // CANCELED
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── HELPER ────────────────────────────────────────────────────────────
    private static InvoiceDto ToDto(Invoice i) =>
        new(i.Id, i.InvoiceNo, i.EncounterId, i.Status, i.TotalAmount, i.IssuedAt, i.PaidAt,
            i.Items.Select(x => new InvoiceItemDto(
                x.Id, x.Description, x.Quantity, x.UnitPrice, x.TotalPrice,
                x.Product?.Name)).ToList(),
            i.Receipt is null ? null : new ReceiptDto(
                i.Receipt.Id, i.Receipt.ReceiptNo, i.Receipt.PaymentMethod,
                i.Receipt.Amount, i.Receipt.PaidAt));
}

// ── RECORDS ───────────────────────────────────────────────────────────────
public record BillingEncounterItem(
    string EncounterId, string EncounterNo, string Hn, string PatientName,
    DateTime AdmissionDate, int? InvoiceStatus, string? InvoiceNo, decimal? TotalAmount);

public record InvoiceItemDto(
    string Id, string Description, int Quantity, decimal UnitPrice, decimal TotalPrice,
    string? ProductName);

public record ReceiptDto(string Id, string ReceiptNo, int PaymentMethod, decimal Amount, DateTime PaidAt);

public record InvoiceDto(
    string Id, string InvoiceNo, string EncounterId, int Status,
    decimal TotalAmount, DateTime IssuedAt, DateTime? PaidAt,
    IEnumerable<InvoiceItemDto> Items, ReceiptDto? Receipt);

public record PayRequest(int? PaymentMethod, decimal Amount);
