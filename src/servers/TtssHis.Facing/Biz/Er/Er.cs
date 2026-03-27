// src/servers/TtssHis.Facing/Biz/Er/Er.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Encounter;
using TtssHis.Shared.Entities.Er;

namespace TtssHis.Facing.Biz.Er;

[ApiController]
[Authorize]
public sealed class ErController(HisDbContext db) : ControllerBase
{
    // ── CREATE ER ENCOUNTER ───────────────────────────────────────────────
    /// <summary>POST /api/er/encounters — register ER arrival</summary>
    [HttpPost("api/er/encounters")]
    public async Task<ActionResult<ErEncounterDto>> CreateErEncounter([FromBody] CreateErEncounterRequest req)
    {
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == req.PatientId && p.DeletedDate == null);
        if (patient is null) return NotFound("Patient not found.");

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var erCount = db.Encounters.Count(e => e.Type == 3 && e.EncounterNo.StartsWith("ER" + today));
        var encounterNo = $"ER{today}{(erCount + 1):D5}";

        var encounter = new Encounter
        {
            Id             = Guid.NewGuid().ToString(),
            EncounterNo    = encounterNo,
            PatientId      = req.PatientId,
            Type           = 3,  // ER
            Status         = 1,  // OPEN
            DivisionId     = "div-er",
            ChiefComplaint = req.ChiefComplaint,
            AdmissionDate  = DateTime.UtcNow,
            IsActive       = true,
            CreatedDate    = DateTime.UtcNow,
        };

        var triage = new ErTriage
        {
            Id           = Guid.NewGuid().ToString(),
            EncounterId  = encounter.Id,
            Severity     = req.Severity,
            ArrivalMode  = req.ArrivalMode,
            TriageNotes  = req.TriageNotes,
            TriageBy     = req.TriageBy,
            TriageTime   = DateTime.UtcNow,
        };

        db.Encounters.Add(encounter);
        db.ErTriages.Add(triage);
        await db.SaveChangesAsync();

        return Ok(new ErEncounterDto(
            encounter.Id, encounter.EncounterNo,
            patient.Hn, (patient.PreName ?? "") + patient.FirstName + " " + patient.LastName,
            triage.Severity, triage.ArrivalMode, triage.TriageNotes,
            encounter.Status, encounter.AdmissionDate, triage.Disposition
        ));
    }

    // ── ER WORKLIST ───────────────────────────────────────────────────────
    /// <summary>GET /api/er/encounters — active ER encounters</summary>
    [HttpGet("api/er/encounters")]
    public ActionResult<IEnumerable<ErEncounterDto>> List([FromQuery] bool includeDisposed = false)
    {
        var query = db.Encounters
            .Include(e => e.Patient)
            .Include(e => e.ErTriage)
            .Where(e => e.Type == 3 && e.IsActive && e.DeletedDate == null);

        if (!includeDisposed)
            query = query.Where(e => e.Status == 1 || e.Status == 2);

        var items = query
            .OrderBy(e => e.ErTriage!.Severity)
            .ThenBy(e => e.AdmissionDate)
            .Select(e => new ErEncounterDto(
                e.Id, e.EncounterNo,
                e.Patient!.Hn, (e.Patient.PreName ?? "") + e.Patient.FirstName + " " + e.Patient.LastName,
                e.ErTriage != null ? e.ErTriage.Severity : 3,
                e.ErTriage != null ? e.ErTriage.ArrivalMode : 1,
                e.ErTriage != null ? e.ErTriage.TriageNotes : null,
                e.Status, e.AdmissionDate,
                e.ErTriage != null ? e.ErTriage.Disposition : null
            ))
            .ToList();

        return Ok(items);
    }

    // ── UPDATE TRIAGE ─────────────────────────────────────────────────────
    /// <summary>PATCH /api/er/encounters/{id}/triage — update severity/notes</summary>
    [HttpPatch("api/er/encounters/{id}/triage")]
    public async Task<IActionResult> UpdateTriage(string id, [FromBody] UpdateTriageRequest req)
    {
        var triage = await db.ErTriages.FirstOrDefaultAsync(t => t.EncounterId == id);
        if (triage is null) return NotFound();

        triage.Severity    = req.Severity;
        triage.TriageNotes = req.TriageNotes;
        triage.TriageBy    = req.TriageBy;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── DISPOSITION ───────────────────────────────────────────────────────
    /// <summary>PATCH /api/er/encounters/{id}/disposition — discharge/admit/refer</summary>
    [HttpPatch("api/er/encounters/{id}/disposition")]
    public async Task<IActionResult> SetDisposition(string id, [FromBody] DispositionRequest req)
    {
        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.Id == id && e.Type == 3 && e.DeletedDate == null);
        if (encounter is null) return NotFound("Encounter not found.");

        var triage = await db.ErTriages.FirstOrDefaultAsync(t => t.EncounterId == id);
        if (triage is null) return NotFound("Triage not found.");

        triage.Disposition     = req.Disposition;
        triage.DispositionTime = DateTime.UtcNow;

        if (req.Disposition == 1 || req.Disposition == 3) // Discharge or Refer
        {
            encounter.Status       = 3;  // DISCHARGED
            encounter.DischargeDate = DateTime.UtcNow;
        }
        else if (req.Disposition == 2) // Admit to IPD
        {
            encounter.Status = 2;  // ADMITTED
        }

        await db.SaveChangesAsync();
        return NoContent();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record CreateErEncounterRequest(
    string PatientId,
    string? ChiefComplaint,
    int Severity,
    int ArrivalMode,
    string? TriageNotes,
    string? TriageBy
);

public record ErEncounterDto(
    string EncounterId,
    string EncounterNo,
    string Hn,
    string PatientName,
    int Severity,
    int ArrivalMode,
    string? TriageNotes,
    int Status,
    DateTime AdmissionDate,
    int? Disposition
);

public record UpdateTriageRequest(int Severity, string? TriageNotes, string? TriageBy);
public record DispositionRequest(int Disposition);
