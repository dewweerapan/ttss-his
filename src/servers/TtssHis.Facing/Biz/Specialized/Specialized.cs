// src/servers/TtssHis.Facing/Biz/Specialized/Specialized.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Specialized;

namespace TtssHis.Facing.Biz.Specialized;

[ApiController]
[Authorize]
public sealed class Specialized(HisDbContext db) : ControllerBase
{
    // ── HEMODIALYSIS ──────────────────────────────────────────────────────

    /// <summary>GET /api/dialysis-sessions</summary>
    [HttpGet("api/dialysis-sessions")]
    public async Task<ActionResult<IEnumerable<DialysisSessionDto>>> ListDialysis(
        [FromQuery] string? encounterId = null,
        [FromQuery] int? status = null)
    {
        var q = db.DialysisSessions
            .Include(d => d.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();
        if (encounterId is not null) q = q.Where(d => d.EncounterId == encounterId);
        if (status.HasValue)         q = q.Where(d => d.Status == status.Value);

        var items = await q.OrderByDescending(d => d.ScheduledAt)
            .Select(d => ToDialysisDto(d))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>POST /api/dialysis-sessions</summary>
    [HttpPost("api/dialysis-sessions")]
    public async Task<ActionResult<DialysisSessionDto>> ScheduleDialysis([FromBody] ScheduleDialysisReq req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == req.EncounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var ds = new DialysisSession
        {
            Id           = Guid.NewGuid().ToString(),
            EncounterId  = req.EncounterId,
            DialysisType = req.DialysisType,
            MachineNo    = req.MachineNo,
            ScheduledAt  = req.ScheduledAt.ToUniversalTime(),
            UfGoal       = req.UfGoal,
            AccessType   = req.AccessType,
            NurseId      = req.NurseId,
            Status       = 1,
        };
        db.DialysisSessions.Add(ds);
        await db.SaveChangesAsync();
        return Ok(ToDialysisDto(ds));
    }

    /// <summary>PATCH /api/dialysis-sessions/{id}/start</summary>
    [HttpPatch("api/dialysis-sessions/{id}/start")]
    public async Task<IActionResult> StartDialysis(string id, [FromBody] StartDialysisReq req)
    {
        var ds = await db.DialysisSessions.FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();
        ds.Status    = 2;
        ds.StartedAt = DateTime.UtcNow;
        ds.PreWeight = req.PreWeight;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/dialysis-sessions/{id}/complete</summary>
    [HttpPatch("api/dialysis-sessions/{id}/complete")]
    public async Task<IActionResult> CompleteDialysis(string id, [FromBody] CompleteDialysisReq req)
    {
        var ds = await db.DialysisSessions.FirstOrDefaultAsync(d => d.Id == id);
        if (ds is null) return NotFound();
        if (ds.Status != 2) return BadRequest("Session is not in progress.");
        ds.Status       = 3;
        ds.EndedAt      = DateTime.UtcNow;
        ds.PostWeight   = req.PostWeight;
        ds.UfAchieved   = req.UfAchieved;
        ds.Complications = req.Complications;
        ds.Notes        = req.Notes;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── TREATMENT ROOM ────────────────────────────────────────────────────

    /// <summary>GET /api/treatment-records</summary>
    [HttpGet("api/treatment-records")]
    public async Task<ActionResult<IEnumerable<TreatmentRecordDto>>> ListTreatment(
        [FromQuery] string? encounterId = null,
        [FromQuery] int? status = null)
    {
        var q = db.TreatmentRecords
            .Include(t => t.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();
        if (encounterId is not null) q = q.Where(t => t.EncounterId == encounterId);
        if (status.HasValue)         q = q.Where(t => t.Status == status.Value);

        var items = await q.OrderByDescending(t => t.ScheduledAt)
            .Select(t => ToTreatmentDto(t))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>POST /api/treatment-records</summary>
    [HttpPost("api/treatment-records")]
    public async Task<ActionResult<TreatmentRecordDto>> CreateTreatment([FromBody] CreateTreatmentReq req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == req.EncounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var tr = new TreatmentRecord
        {
            Id            = Guid.NewGuid().ToString(),
            EncounterId   = req.EncounterId,
            TreatmentType = req.TreatmentType,
            Description   = req.Description,
            Materials     = req.Materials,
            PerformedBy   = req.PerformedBy,
            ScheduledAt   = req.ScheduledAt?.ToUniversalTime() ?? DateTime.UtcNow,
            Status        = 1,
        };
        db.TreatmentRecords.Add(tr);
        await db.SaveChangesAsync();
        return Ok(ToTreatmentDto(tr));
    }

    /// <summary>PATCH /api/treatment-records/{id}/complete</summary>
    [HttpPatch("api/treatment-records/{id}/complete")]
    public async Task<IActionResult> CompleteTreatment(string id, [FromBody] CompleteTreatmentReq req)
    {
        var tr = await db.TreatmentRecords.FirstOrDefaultAsync(t => t.Id == id);
        if (tr is null) return NotFound();
        tr.Status       = 2;
        tr.CompletedAt  = DateTime.UtcNow;
        tr.OutcomeNotes = req.OutcomeNotes;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/treatment-records/{id}/cancel</summary>
    [HttpPatch("api/treatment-records/{id}/cancel")]
    public async Task<IActionResult> CancelTreatment(string id)
    {
        var tr = await db.TreatmentRecords.FirstOrDefaultAsync(t => t.Id == id);
        if (tr is null) return NotFound();
        tr.Status = 9;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static DialysisSessionDto ToDialysisDto(DialysisSession d) => new(
        d.Id, d.EncounterId,
        d.Encounter?.Patient != null
            ? (d.Encounter.Patient.PreName ?? "") + d.Encounter.Patient.FirstName + " " + d.Encounter.Patient.LastName
            : null,
        d.Encounter?.Patient?.Hn,
        d.DialysisType, d.MachineNo, d.Status,
        d.ScheduledAt, d.StartedAt, d.EndedAt,
        d.PreWeight, d.PostWeight, d.UfGoal, d.UfAchieved,
        d.AccessType, d.Complications, d.Notes
    );

    private static TreatmentRecordDto ToTreatmentDto(TreatmentRecord t) => new(
        t.Id, t.EncounterId,
        t.Encounter?.Patient != null
            ? (t.Encounter.Patient.PreName ?? "") + t.Encounter.Patient.FirstName + " " + t.Encounter.Patient.LastName
            : null,
        t.Encounter?.Patient?.Hn,
        t.TreatmentType, t.Description, t.Materials, t.PerformedBy,
        t.Status, t.ScheduledAt, t.CompletedAt, t.OutcomeNotes
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record ScheduleDialysisReq(
    string EncounterId, int DialysisType, string? MachineNo,
    DateTime ScheduledAt, decimal? UfGoal, string? AccessType, string? NurseId
);
public record StartDialysisReq(decimal? PreWeight);
public record CompleteDialysisReq(decimal? PostWeight, decimal? UfAchieved, string? Complications, string? Notes);
public record DialysisSessionDto(
    string Id, string EncounterId, string? PatientName, string? Hn,
    int DialysisType, string? MachineNo, int Status,
    DateTime ScheduledAt, DateTime? StartedAt, DateTime? EndedAt,
    decimal? PreWeight, decimal? PostWeight, decimal? UfGoal, decimal? UfAchieved,
    string? AccessType, string? Complications, string? Notes
);

public record CreateTreatmentReq(
    string EncounterId, int TreatmentType,
    string Description, string? Materials, string? PerformedBy, DateTime? ScheduledAt
);
public record CompleteTreatmentReq(string? OutcomeNotes);
public record TreatmentRecordDto(
    string Id, string EncounterId, string? PatientName, string? Hn,
    int TreatmentType, string Description, string? Materials, string? PerformedBy,
    int Status, DateTime ScheduledAt, DateTime? CompletedAt, string? OutcomeNotes
);
