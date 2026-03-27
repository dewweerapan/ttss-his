// src/servers/TtssHis.Facing/Biz/IpdChart/IpdChart.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Ipd;

namespace TtssHis.Facing.Biz.IpdChart;

[ApiController]
[Authorize]
public sealed class IpdChart(HisDbContext db) : ControllerBase
{
    // ── NURSING NOTES ─────────────────────────────────────────────────────

    /// <summary>GET /api/encounters/{id}/nursing-notes</summary>
    [HttpGet("api/encounters/{encounterId}/nursing-notes")]
    public async Task<ActionResult<IEnumerable<NursingNoteDto>>> ListNursingNotes(string encounterId)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var notes = await db.NursingNotes
            .Where(n => n.EncounterId == encounterId)
            .OrderByDescending(n => n.RecordedDate)
            .Select(n => new NursingNoteDto(n.Id, n.EncounterId, n.NoteType, n.Content, n.RecordedBy, n.RecordedDate))
            .ToListAsync();

        return Ok(notes);
    }

    /// <summary>POST /api/encounters/{id}/nursing-notes</summary>
    [HttpPost("api/encounters/{encounterId}/nursing-notes")]
    public async Task<ActionResult<NursingNoteDto>> AddNursingNote(
        string encounterId, [FromBody] AddNursingNoteRequest req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");
        if (enc.Type != 2) return BadRequest("Nursing notes are only for IPD encounters.");

        var note = new NursingNote
        {
            Id           = Guid.NewGuid().ToString(),
            EncounterId  = encounterId,
            NoteType     = req.NoteType,
            Content      = req.Content,
            RecordedBy   = req.RecordedBy,
            RecordedDate = DateTime.UtcNow,
        };

        db.NursingNotes.Add(note);
        await db.SaveChangesAsync();

        return Ok(new NursingNoteDto(note.Id, note.EncounterId, note.NoteType, note.Content, note.RecordedBy, note.RecordedDate));
    }

    /// <summary>DELETE /api/nursing-notes/{id}</summary>
    [HttpDelete("api/nursing-notes/{id}")]
    public async Task<IActionResult> DeleteNursingNote(string id)
    {
        var note = await db.NursingNotes.FirstOrDefaultAsync(n => n.Id == id);
        if (note is null) return NotFound();

        db.NursingNotes.Remove(note);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── DOCTOR ORDERS ─────────────────────────────────────────────────────

    /// <summary>GET /api/encounters/{id}/doctor-orders</summary>
    [HttpGet("api/encounters/{encounterId}/doctor-orders")]
    public async Task<ActionResult<IEnumerable<DoctorOrderDto>>> ListDoctorOrders(string encounterId)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var orders = await db.DoctorOrders
            .Where(o => o.EncounterId == encounterId)
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new DoctorOrderDto(
                o.Id, o.EncounterId, o.OrderType, o.OrderContent,
                o.DoctorId, o.Status, o.OrderDate, o.CompletedAt, o.Notes))
            .ToListAsync();

        return Ok(orders);
    }

    /// <summary>POST /api/encounters/{id}/doctor-orders</summary>
    [HttpPost("api/encounters/{encounterId}/doctor-orders")]
    public async Task<ActionResult<DoctorOrderDto>> AddDoctorOrder(
        string encounterId, [FromBody] AddDoctorOrderRequest req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");
        if (enc.Type != 2) return BadRequest("Doctor orders (IPD) are only for IPD encounters.");

        var order = new DoctorOrder
        {
            Id           = Guid.NewGuid().ToString(),
            EncounterId  = encounterId,
            OrderType    = req.OrderType,
            OrderContent = req.OrderContent,
            DoctorId     = req.DoctorId,
            Status       = 1,  // ACTIVE
            OrderDate    = DateTime.UtcNow,
            Notes        = req.Notes,
        };

        db.DoctorOrders.Add(order);
        await db.SaveChangesAsync();

        return Ok(new DoctorOrderDto(
            order.Id, order.EncounterId, order.OrderType, order.OrderContent,
            order.DoctorId, order.Status, order.OrderDate, order.CompletedAt, order.Notes));
    }

    /// <summary>PATCH /api/doctor-orders/{id}/complete — mark order as completed</summary>
    [HttpPatch("api/doctor-orders/{id}/complete")]
    public async Task<IActionResult> CompleteOrder(string id)
    {
        var order = await db.DoctorOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (order.Status != 1) return BadRequest("Order is not ACTIVE.");

        order.Status      = 2;  // COMPLETED
        order.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/doctor-orders/{id}/cancel</summary>
    [HttpPatch("api/doctor-orders/{id}/cancel")]
    public async Task<IActionResult> CancelOrder(string id)
    {
        var order = await db.DoctorOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (order.Status == 2) return BadRequest("Cannot cancel a completed order.");

        order.Status = 9;  // CANCELLED
        await db.SaveChangesAsync();
        return NoContent();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record AddNursingNoteRequest(
    int NoteType,
    string Content,
    string? RecordedBy
);

public record NursingNoteDto(
    string Id,
    string EncounterId,
    int NoteType,
    string Content,
    string? RecordedBy,
    DateTime RecordedDate
);

public record AddDoctorOrderRequest(
    int OrderType,
    string OrderContent,
    string? DoctorId,
    string? Notes
);

public record DoctorOrderDto(
    string Id,
    string EncounterId,
    int OrderType,
    string OrderContent,
    string? DoctorId,
    int Status,
    DateTime OrderDate,
    DateTime? CompletedAt,
    string? Notes
);
