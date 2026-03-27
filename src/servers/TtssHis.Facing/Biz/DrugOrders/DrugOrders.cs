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

    // ── GET SINGLE ────────────────────────────────────────────────────────
    /// <summary>GET /api/drug-orders/{id}</summary>
    [HttpGet("api/drug-orders/{id}")]
    public async Task<ActionResult<DrugOrderListItem>> GetById(string id)
    {
        var order = await db.DrugOrders
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        return Ok(ToListItem(order));
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

        // Deduct stock for each item
        foreach (var item in order.Items)
        {
            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == item.ProductId);
            if (product is not null)
                product.StockQuantity = Math.Max(0, product.StockQuantity - item.Quantity);
        }

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

    // ── DRUG INTERACTION CHECK ────────────────────────────────────────────
    private static readonly List<(string Code1, string Code2, string Severity, string Description)> InteractionRules =
    [
        ("WARFARIN", "ASPIRIN", "HIGH", "เพิ่มความเสี่ยงเลือดออก"),
        ("WARFARIN", "NSAID", "HIGH", "เพิ่มฤทธิ์ต้านการแข็งตัวของเลือด"),
        ("SSRI", "MAOI", "CRITICAL", "Serotonin syndrome — ห้ามใช้ร่วมกัน"),
        ("METFORMIN", "ALCOHOL", "MODERATE", "เพิ่มความเสี่ยง lactic acidosis"),
        ("DIGOXIN", "AMIODARONE", "HIGH", "เพิ่มระดับ digoxin ในเลือด"),
        ("SIMVASTATIN", "AMIODARONE", "HIGH", "เพิ่มความเสี่ยง myopathy"),
        ("ACE_INHIBITOR", "POTASSIUM", "MODERATE", "เสี่ยง hyperkalemia"),
        ("CLOPIDOGREL", "OMEPRAZOLE", "MODERATE", "ลดประสิทธิภาพ clopidogrel"),
    ];

    /// <summary>POST /api/drug-interactions/check</summary>
    [HttpPost("/api/drug-interactions/check")]
    public async Task<ActionResult<InteractionCheckResponse>> CheckInteractions([FromBody] InteractionCheckRequest req)
    {
        var products = await db.Products
            .Where(p => req.ProductIds.Contains(p.Id) && p.DeletedDate == null)
            .Select(p => new { p.Id, p.Code, p.Name })
            .ToListAsync();

        var interactions = new List<InteractionResult>();

        for (int i = 0; i < products.Count; i++)
        {
            for (int j = i + 1; j < products.Count; j++)
            {
                var p1 = products[i];
                var p2 = products[j];

                foreach (var rule in InteractionRules)
                {
                    bool p1MatchesCode1 = p1.Code.Contains(rule.Code1, StringComparison.OrdinalIgnoreCase);
                    bool p2MatchesCode2 = p2.Code.Contains(rule.Code2, StringComparison.OrdinalIgnoreCase);
                    bool p1MatchesCode2 = p1.Code.Contains(rule.Code2, StringComparison.OrdinalIgnoreCase);
                    bool p2MatchesCode1 = p2.Code.Contains(rule.Code1, StringComparison.OrdinalIgnoreCase);

                    if ((p1MatchesCode1 && p2MatchesCode2) || (p1MatchesCode2 && p2MatchesCode1))
                    {
                        interactions.Add(new InteractionResult(p1.Name, p2.Name, rule.Severity, rule.Description));
                    }
                }
            }
        }

        return Ok(new InteractionCheckResponse(interactions));
    }

    /// <summary>GET /api/products/by-ids?ids=id1,id2</summary>
    [HttpGet("/api/products/by-ids")]
    public async Task<ActionResult<IEnumerable<ProductBasicDto>>> GetByIds([FromQuery] string ids)
    {
        var idList = ids.Split(',', StringSplitOptions.RemoveEmptyEntries);
        var products = await db.Products
            .Where(p => idList.Contains(p.Id) && p.DeletedDate == null)
            .Select(p => new ProductBasicDto(p.Id, p.Code, p.Name))
            .ToListAsync();
        return Ok(products);
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

public record InteractionCheckRequest(IEnumerable<string> ProductIds);
public record InteractionResult(string Drug1, string Drug2, string Severity, string Description);
public record InteractionCheckResponse(IEnumerable<InteractionResult> Interactions);
public record ProductBasicDto(string Id, string Code, string Name);
