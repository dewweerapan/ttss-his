// src/servers/TtssHis.Facing/Biz/OperatingRoom/OperatingRoom.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Or;

namespace TtssHis.Facing.Biz.OperatingRoom;

[ApiController]
[Authorize]
public sealed class OperatingRoom(HisDbContext db) : ControllerBase
{
    /// <summary>GET /api/surgery-cases — list scheduled/active cases</summary>
    [HttpGet("api/surgery-cases")]
    public async Task<ActionResult<IEnumerable<SurgeryCaseDto>>> List(
        [FromQuery] int? status = null,
        [FromQuery] string? date = null)
    {
        var q = db.SurgeryCases
            .Include(s => s.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();

        if (status.HasValue) q = q.Where(s => s.Status == status.Value);
        else q = q.Where(s => s.Status == 1 || s.Status == 2);

        if (date is not null && DateTime.TryParse(date, out var d))
        {
            var start = d.Date.ToUniversalTime();
            var end   = start.AddDays(1);
            q = q.Where(s => s.ScheduledAt >= start && s.ScheduledAt < end);
        }

        var items = await q.OrderBy(s => s.ScheduledAt)
            .Select(s => ToDto(s))
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>GET /api/surgery-cases/{id}</summary>
    [HttpGet("api/surgery-cases/{id}")]
    public async Task<ActionResult<SurgeryCaseDto>> GetById(string id)
    {
        var s = await db.SurgeryCases
            .Include(x => x.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (s is null) return NotFound();
        return Ok(ToDto(s));
    }

    /// <summary>POST /api/surgery-cases — schedule new surgery</summary>
    [HttpPost("api/surgery-cases")]
    public async Task<ActionResult<SurgeryCaseDto>> Schedule([FromBody] ScheduleSurgeryRequest req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == req.EncounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var sc = new SurgeryCase
        {
            Id                  = Guid.NewGuid().ToString(),
            EncounterId         = req.EncounterId,
            ProcedureName       = req.ProcedureName,
            OperatingRoom       = req.OperatingRoom,
            ScheduledAt         = req.ScheduledAt.ToUniversalTime(),
            SurgeonId           = req.SurgeonId,
            SurgeonName         = req.SurgeonName,
            AnesthesiaType      = req.AnesthesiaType,
            AnesthesiologistName = req.AnesthesiologistName,
            PreOpDiagnosis      = req.PreOpDiagnosis,
            Status              = 1,
            CreatedDate         = DateTime.UtcNow,
        };

        db.SurgeryCases.Add(sc);
        await db.SaveChangesAsync();

        return Ok(ToDto(sc));
    }

    /// <summary>PATCH /api/surgery-cases/{id}/start</summary>
    [HttpPatch("api/surgery-cases/{id}/start")]
    public async Task<IActionResult> Start(string id)
    {
        var sc = await db.SurgeryCases.FirstOrDefaultAsync(s => s.Id == id);
        if (sc is null) return NotFound();
        if (sc.Status != 1) return BadRequest("Case is not in SCHEDULED status.");
        sc.Status    = 2;
        sc.StartedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/surgery-cases/{id}/complete</summary>
    [HttpPatch("api/surgery-cases/{id}/complete")]
    public async Task<IActionResult> Complete(string id, [FromBody] CompleteSurgeryRequest req)
    {
        var sc = await db.SurgeryCases.FirstOrDefaultAsync(s => s.Id == id);
        if (sc is null) return NotFound();
        if (sc.Status != 2) return BadRequest("Case is not IN_PROGRESS.");
        sc.Status          = 3;
        sc.EndedAt         = DateTime.UtcNow;
        sc.PostOpDiagnosis = req.PostOpDiagnosis;
        sc.OperativeNotes  = req.OperativeNotes;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/surgery-cases/{id}/cancel</summary>
    [HttpPatch("api/surgery-cases/{id}/cancel")]
    public async Task<IActionResult> Cancel(string id)
    {
        var sc = await db.SurgeryCases.FirstOrDefaultAsync(s => s.Id == id);
        if (sc is null) return NotFound();
        if (sc.Status == 3) return BadRequest("Cannot cancel a completed case.");
        sc.Status = 9;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static SurgeryCaseDto ToDto(SurgeryCase s) => new(
        s.Id, s.EncounterId,
        s.Encounter?.Patient != null
            ? (s.Encounter.Patient.PreName ?? "") + s.Encounter.Patient.FirstName + " " + s.Encounter.Patient.LastName
            : null,
        s.Encounter?.Patient?.Hn,
        s.ProcedureName, s.OperatingRoom, s.Status,
        s.ScheduledAt, s.StartedAt, s.EndedAt,
        s.SurgeonName, s.AnesthesiaType, s.AnesthesiologistName,
        s.PreOpDiagnosis, s.PostOpDiagnosis, s.OperativeNotes, s.CreatedDate
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record ScheduleSurgeryRequest(
    string EncounterId,
    string ProcedureName,
    string? OperatingRoom,
    DateTime ScheduledAt,
    string? SurgeonId,
    string? SurgeonName,
    string? AnesthesiaType,
    string? AnesthesiologistName,
    string? PreOpDiagnosis
);

public record CompleteSurgeryRequest(
    string? PostOpDiagnosis,
    string? OperativeNotes
);

public record SurgeryCaseDto(
    string Id,
    string EncounterId,
    string? PatientName,
    string? Hn,
    string ProcedureName,
    string? OperatingRoom,
    int Status,
    DateTime ScheduledAt,
    DateTime? StartedAt,
    DateTime? EndedAt,
    string? SurgeonName,
    string? AnesthesiaType,
    string? AnesthesiologistName,
    string? PreOpDiagnosis,
    string? PostOpDiagnosis,
    string? OperativeNotes,
    DateTime CreatedDate
);
