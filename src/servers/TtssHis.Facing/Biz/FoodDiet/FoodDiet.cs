// src/servers/TtssHis.Facing/Biz/FoodDiet/FoodDiet.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Ipd;

namespace TtssHis.Facing.Biz.FoodDiet;

[ApiController]
[Authorize]
public sealed class FoodDiet(HisDbContext db) : ControllerBase
{
    // ── DIET ORDERS ───────────────────────────────────────────────────────

    /// <summary>GET /api/encounters/{id}/diet-orders</summary>
    [HttpGet("api/encounters/{encounterId}/diet-orders")]
    public async Task<ActionResult<IEnumerable<DietOrderDto>>> ListDietOrders(string encounterId)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var orders = await db.DietOrders
            .Where(d => d.EncounterId == encounterId)
            .OrderByDescending(d => d.OrderDate)
            .Select(d => new DietOrderDto(
                d.Id, d.EncounterId, d.DietType, d.Meal,
                d.Notes, d.Status, d.OrderDate, d.OrderedBy, d.CancelledAt))
            .ToListAsync();

        return Ok(orders);
    }

    /// <summary>POST /api/encounters/{id}/diet-orders</summary>
    [HttpPost("api/encounters/{encounterId}/diet-orders")]
    public async Task<ActionResult<DietOrderDto>> AddDietOrder(
        string encounterId, [FromBody] AddDietOrderRequest req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");
        if (enc.Type != 2) return BadRequest("Diet orders are for IPD encounters only.");

        var order = new DietOrder
        {
            Id          = Guid.NewGuid().ToString(),
            EncounterId = encounterId,
            DietType    = req.DietType,
            Meal        = req.Meal,
            Notes       = req.Notes,
            Status      = 1,
            OrderDate   = DateTime.UtcNow,
            OrderedBy   = req.OrderedBy,
        };

        db.DietOrders.Add(order);
        await db.SaveChangesAsync();

        return Ok(new DietOrderDto(
            order.Id, order.EncounterId, order.DietType, order.Meal,
            order.Notes, order.Status, order.OrderDate, order.OrderedBy, order.CancelledAt));
    }

    /// <summary>PATCH /api/diet-orders/{id}/cancel</summary>
    [HttpPatch("api/diet-orders/{id}/cancel")]
    public async Task<IActionResult> CancelDietOrder(string id)
    {
        var order = await db.DietOrders.FirstOrDefaultAsync(d => d.Id == id);
        if (order is null) return NotFound();
        if (order.Status != 1) return BadRequest("Order is not active.");

        order.Status      = 9;
        order.CancelledAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── SUPPLY REQUESTS ───────────────────────────────────────────────────

    /// <summary>GET /api/encounters/{id}/supply-requests</summary>
    [HttpGet("api/encounters/{encounterId}/supply-requests")]
    public async Task<ActionResult<IEnumerable<SupplyRequestDto>>> ListSupplyRequests(string encounterId)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var requests = await db.SupplyRequests
            .Where(s => s.EncounterId == encounterId)
            .OrderByDescending(s => s.RequestDate)
            .Select(s => new SupplyRequestDto(
                s.Id, s.EncounterId, s.ItemName, s.ProductId, s.Quantity,
                s.Notes, s.Status, s.RequestDate, s.RequestedBy, s.DispensedAt, s.DispensedBy))
            .ToListAsync();

        return Ok(requests);
    }

    /// <summary>POST /api/encounters/{id}/supply-requests</summary>
    [HttpPost("api/encounters/{encounterId}/supply-requests")]
    public async Task<ActionResult<SupplyRequestDto>> AddSupplyRequest(
        string encounterId, [FromBody] AddSupplyRequestRequest req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");
        if (enc.Type != 2) return BadRequest("Supply requests are for IPD encounters only.");

        var sr = new SupplyRequest
        {
            Id          = Guid.NewGuid().ToString(),
            EncounterId = encounterId,
            ItemName    = req.ItemName,
            ProductId   = req.ProductId,
            Quantity    = req.Quantity,
            Notes       = req.Notes,
            Status      = 1,
            RequestDate = DateTime.UtcNow,
            RequestedBy = req.RequestedBy,
        };

        db.SupplyRequests.Add(sr);
        await db.SaveChangesAsync();

        return Ok(new SupplyRequestDto(
            sr.Id, sr.EncounterId, sr.ItemName, sr.ProductId, sr.Quantity,
            sr.Notes, sr.Status, sr.RequestDate, sr.RequestedBy, sr.DispensedAt, sr.DispensedBy));
    }

    /// <summary>PATCH /api/supply-requests/{id}/dispense</summary>
    [HttpPatch("api/supply-requests/{id}/dispense")]
    public async Task<IActionResult> DispenseSupply(string id, [FromBody] DispenseSupplyRequest req)
    {
        var sr = await db.SupplyRequests.FirstOrDefaultAsync(s => s.Id == id);
        if (sr is null) return NotFound();
        if (sr.Status != 1) return BadRequest("Request is not in REQUESTED status.");

        sr.Status      = 2;
        sr.DispensedAt = DateTime.UtcNow;
        sr.DispensedBy = req.DispensedBy;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/supply-requests/{id}/cancel</summary>
    [HttpPatch("api/supply-requests/{id}/cancel")]
    public async Task<IActionResult> CancelSupplyRequest(string id)
    {
        var sr = await db.SupplyRequests.FirstOrDefaultAsync(s => s.Id == id);
        if (sr is null) return NotFound();
        if (sr.Status == 2) return BadRequest("Cannot cancel a dispensed request.");

        sr.Status = 9;
        await db.SaveChangesAsync();
        return NoContent();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record AddDietOrderRequest(
    int DietType,
    int Meal,
    string? Notes,
    string? OrderedBy
);

public record DietOrderDto(
    string Id,
    string EncounterId,
    int DietType,
    int Meal,
    string? Notes,
    int Status,
    DateTime OrderDate,
    string? OrderedBy,
    DateTime? CancelledAt
);

public record AddSupplyRequestRequest(
    string ItemName,
    string? ProductId,
    int Quantity,
    string? Notes,
    string? RequestedBy
);

public record SupplyRequestDto(
    string Id,
    string EncounterId,
    string ItemName,
    string? ProductId,
    int Quantity,
    string? Notes,
    int Status,
    DateTime RequestDate,
    string? RequestedBy,
    DateTime? DispensedAt,
    string? DispensedBy
);

public record DispenseSupplyRequest(string? DispensedBy);
