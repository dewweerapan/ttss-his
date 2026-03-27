// src/servers/TtssHis.Facing/Biz/DrugOrders/DrugOrders.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Pharmacy;

namespace TtssHis.Facing.Biz.DrugOrders;

[ApiController]
[Authorize]
public sealed class DrugOrders(HisDbContext db) : ControllerBase
{
    // ── LIST (pharmacy worklist) ───────────────────────────────────────────
    /// <summary>GET /api/drug-orders?status=1 — pharmacy worklist</summary>
    [HttpGet("api/drug-orders")]
    public ActionResult<IEnumerable<DrugOrderListItem>> List([FromQuery] int? status)
    {
        var query = db.DrugOrders
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);

        var items = query
            .OrderBy(o => o.OrderDate)
            .Select(o => new DrugOrderListItem(
                o.Id,
                o.OrderNo,
                o.EncounterId,
                o.Encounter!.EncounterNo,
                o.Encounter.Patient!.Hn,
                (o.Encounter.Patient.PreName ?? "") + o.Encounter.Patient.FirstName + " " + o.Encounter.Patient.LastName,
                o.Status,
                o.OrderDate,
                o.Items.Count,
                o.Items.Select(i => new DrugOrderItemDto(
                    i.Id, i.ProductId, i.Product!.Name,
                    i.Quantity, i.Frequency, i.DurationDays, i.Instruction,
                    i.Unit ?? i.Product.Unit)).ToList()
            ))
            .ToList();

        return Ok(items);
    }

    // ── CREATE (doctor prescribes) ────────────────────────────────────────
    /// <summary>POST /api/encounters/{encounterId}/drug-orders</summary>
    [HttpPost("api/encounters/{encounterId}/drug-orders")]
    public async Task<ActionResult<DrugOrderListItem>> Create(
        string encounterId,
        [FromBody] CreateDrugOrderRequest req)
    {
        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (encounter is null) return NotFound("Encounter not found.");

        if (!req.Items.Any()) return BadRequest("Drug order must have at least one item.");

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var orderCount = db.DrugOrders.Count(o => o.OrderNo.StartsWith("RX" + today));
        var orderNo = $"RX{today}{(orderCount + 1):D5}";

        var order = new DrugOrder
        {
            Id          = Guid.NewGuid().ToString(),
            OrderNo     = orderNo,
            EncounterId = encounterId,
            DoctorId    = req.DoctorId ?? encounter.DoctorId,
            Status      = 1, // PENDING
            OrderDate   = DateTime.UtcNow,
            Notes       = req.Notes,
        };
        db.DrugOrders.Add(order);

        foreach (var item in req.Items)
        {
            db.DrugOrderItems.Add(new DrugOrderItem
            {
                Id           = Guid.NewGuid().ToString(),
                DrugOrderId  = order.Id,
                ProductId    = item.ProductId,
                Quantity     = item.Quantity,
                Frequency    = item.Frequency,
                DurationDays = item.DurationDays,
                Instruction  = item.Instruction,
                Unit         = item.Unit,
            });
        }

        await db.SaveChangesAsync();

        // Reload for response
        var created = await db.DrugOrders
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Encounter).ThenInclude(e => e!.Patient)
            .FirstAsync(o => o.Id == order.Id);

        return CreatedAtAction(nameof(List), null, ToListItem(created));
    }

    // ── VERIFY (PENDING → VERIFIED) ───────────────────────────────────────
    [HttpPost("api/drug-orders/{id}/verify")]
    public async Task<ActionResult<DrugOrderListItem>> Verify(string id)
    {
        var order = await db.DrugOrders
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();
        if (order.Status != 1) return BadRequest($"Order status is {order.Status}, expected PENDING(1).");

        order.Status     = 2; // VERIFIED
        order.VerifiedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(ToListItem(order));
    }

    // ── DISPENSE (VERIFIED → DISPENSED) ───────────────────────────────────
    [HttpPost("api/drug-orders/{id}/dispense")]
    public async Task<ActionResult<DrugOrderListItem>> Dispense(string id)
    {
        var order = await db.DrugOrders
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return NotFound();
        if (order.Status != 2) return BadRequest($"Order status is {order.Status}, expected VERIFIED(2).");

        order.Status      = 3; // DISPENSED
        order.DispensedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(ToListItem(order));
    }

    // ── CANCEL ────────────────────────────────────────────────────────────
    [HttpPost("api/drug-orders/{id}/cancel")]
    public async Task<IActionResult> Cancel(string id)
    {
        var order = await db.DrugOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (order.Status == 3) return BadRequest("Cannot cancel a dispensed order.");
        if (order.Status == 9) return BadRequest("Order is already canceled.");

        order.Status = 9; // CANCELED
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── HELPER ────────────────────────────────────────────────────────────
    private static DrugOrderListItem ToListItem(DrugOrder o) =>
        new(o.Id, o.OrderNo, o.EncounterId,
            o.Encounter?.EncounterNo ?? "",
            o.Encounter?.Patient?.Hn ?? "",
            (o.Encounter?.Patient?.PreName ?? "") + (o.Encounter?.Patient?.FirstName ?? "") + " " + (o.Encounter?.Patient?.LastName ?? ""),
            o.Status, o.OrderDate, o.Items.Count,
            o.Items.Select(i => new DrugOrderItemDto(
                i.Id, i.ProductId, i.Product?.Name ?? "",
                i.Quantity, i.Frequency, i.DurationDays, i.Instruction,
                i.Unit ?? i.Product?.Unit)).ToList());
}

// ── RECORDS ───────────────────────────────────────────────────────────────
public record DrugOrderListItem(
    string Id, string OrderNo, string EncounterId, string EncounterNo,
    string Hn, string PatientName, int Status, DateTime OrderDate,
    int ItemCount, IEnumerable<DrugOrderItemDto> Items);

public record DrugOrderItemDto(
    string Id, string ProductId, string ProductName,
    int Quantity, string Frequency, int DurationDays,
    string? Instruction, string? Unit);

public record CreateDrugOrderRequest(
    string? DoctorId,
    string? Notes,
    IEnumerable<CreateDrugOrderItemRequest> Items);

public record CreateDrugOrderItemRequest(
    string ProductId, int Quantity, string Frequency,
    int DurationDays, string? Instruction, string? Unit);
