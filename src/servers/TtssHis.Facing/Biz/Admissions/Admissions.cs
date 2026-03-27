// src/servers/TtssHis.Facing/Biz/Admissions/Admissions.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Encounter;

namespace TtssHis.Facing.Biz.Admissions;

[ApiController]
[Authorize]
public sealed class Admissions(HisDbContext db) : ControllerBase
{
    // ── ADMIT PATIENT ─────────────────────────────────────────────────────
    /// <summary>POST /api/admissions — admit a patient to IPD</summary>
    [HttpPost("api/admissions")]
    public async Task<ActionResult<AdmissionDto>> Admit([FromBody] AdmitRequest req)
    {
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == req.PatientId && p.DeletedDate == null);
        if (patient is null) return NotFound("Patient not found.");

        var bed = await db.Beds.FirstOrDefaultAsync(b => b.Id == req.BedId && b.IsActive);
        if (bed is null) return NotFound("Bed not found.");
        if (bed.Status != 1) return BadRequest("Bed is not available.");

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var ipdCount = db.Encounters.Count(e => e.Type == 2 && e.EncounterNo.StartsWith("AN" + today));
        var encounterNo = $"AN{today}{(ipdCount + 1):D5}";

        var encounter = new Encounter
        {
            Id             = Guid.NewGuid().ToString(),
            EncounterNo    = encounterNo,
            PatientId      = req.PatientId,
            Type           = 2,   // IPD
            Status         = 2,   // ADMITTED
            DivisionId     = req.DivisionId ?? "div-icu",
            DoctorId       = req.DoctorId,
            ChiefComplaint = req.ChiefComplaint,
            AdmissionDate  = DateTime.UtcNow,
            BedNumber      = bed.BedNo,
            IsActive       = true,
            CreatedDate    = DateTime.UtcNow,
        };

        bed.Status             = 2;  // OCCUPIED
        bed.CurrentEncounterId = encounter.Id;

        db.Encounters.Add(encounter);
        await db.SaveChangesAsync();

        return Ok(new AdmissionDto(
            encounter.Id,
            encounter.EncounterNo,
            patient.Hn,
            (patient.PreName ?? "") + patient.FirstName + " " + patient.LastName,
            bed.BedNo,
            bed.WardId,
            encounter.AdmissionDate
        ));
    }

    // ── LIST IPD ENCOUNTERS ───────────────────────────────────────────────
    /// <summary>GET /api/admissions — list active IPD encounters</summary>
    [HttpGet("api/admissions")]
    public ActionResult<IEnumerable<IpdEncounterItem>> List(
        [FromQuery] string? wardId = null,
        [FromQuery] int? status = null)
    {
        var query = db.Encounters
            .Include(e => e.Patient)
            .Where(e => e.Type == 2 && e.IsActive && e.DeletedDate == null);

        if (status.HasValue)
            query = query.Where(e => e.Status == status.Value);
        else
            query = query.Where(e => e.Status == 2); // default: ADMITTED only

        var items = query
            .Select(e => new IpdEncounterItem(
                e.Id,
                e.EncounterNo,
                e.Patient!.Hn,
                (e.Patient.PreName ?? "") + e.Patient.FirstName + " " + e.Patient.LastName,
                e.BedNumber,
                e.DivisionId,
                e.Status,
                e.AdmissionDate,
                e.DischargeDate
            ))
            .OrderBy(e => e.AdmissionDate)
            .ToList();

        // Filter by wardId via Bed lookup if specified
        if (wardId is not null)
        {
            var bedNosInWard = db.Beds
                .Where(b => b.WardId == wardId && b.IsActive)
                .Select(b => b.BedNo)
                .ToHashSet();
            items = items.Where(i => i.BedNumber != null && bedNosInWard.Contains(i.BedNumber)).ToList();
        }

        return Ok(items);
    }

    // ── GET IPD ENCOUNTER ─────────────────────────────────────────────────
    /// <summary>GET /api/admissions/{id}</summary>
    [HttpGet("api/admissions/{id}")]
    public async Task<ActionResult<IpdEncounterDetail>> GetById(string id)
    {
        var enc = await db.Encounters
            .Include(e => e.Patient)
            .Include(e => e.Doctor)
            .Include(e => e.Diagnoses).ThenInclude(d => d.Icd10)
            .FirstOrDefaultAsync(e => e.Id == id && e.Type == 2 && e.DeletedDate == null);

        if (enc is null) return NotFound();

        var bed = await db.Beds.FirstOrDefaultAsync(b => b.CurrentEncounterId == id);

        return Ok(new IpdEncounterDetail(
            enc.Id,
            enc.EncounterNo,
            enc.Patient!.Hn,
            (enc.Patient.PreName ?? "") + enc.Patient.FirstName + " " + enc.Patient.LastName,
            enc.Patient.Birthdate,
            enc.BedNumber,
            bed?.WardId,
            enc.DivisionId,
            enc.DoctorId,
            enc.Doctor != null ? enc.Doctor.FirstName + " " + enc.Doctor.LastName : null,
            enc.ChiefComplaint,
            enc.Status,
            enc.AdmissionDate,
            enc.DischargeDate,
            enc.Diagnoses.Select(d => new DiagnosisItem(d.Id, d.Icd10!.Code, d.Icd10.Name, d.Type)).ToList()
        ));
    }

    // ── TRANSFER BED ──────────────────────────────────────────────────────
    /// <summary>PATCH /api/admissions/{id}/transfer — transfer to another bed</summary>
    [HttpPatch("api/admissions/{id}/transfer")]
    public async Task<IActionResult> Transfer(string id, [FromBody] TransferRequest req)
    {
        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.Id == id && e.Type == 2 && e.DeletedDate == null);
        if (encounter is null) return NotFound("Encounter not found.");
        if (encounter.Status != 2) return BadRequest("Encounter is not in ADMITTED status.");

        var newBed = await db.Beds.FirstOrDefaultAsync(b => b.Id == req.NewBedId && b.IsActive);
        if (newBed is null) return NotFound("New bed not found.");
        if (newBed.Status != 1) return BadRequest("New bed is not available.");

        // Release old bed
        var oldBed = await db.Beds.FirstOrDefaultAsync(b => b.CurrentEncounterId == id);
        if (oldBed is not null)
        {
            oldBed.Status             = 1;  // AVAILABLE
            oldBed.CurrentEncounterId = null;
        }

        // Assign new bed
        newBed.Status             = 2;  // OCCUPIED
        newBed.CurrentEncounterId = id;
        encounter.BedNumber       = newBed.BedNo;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── DISCHARGE IPD ─────────────────────────────────────────────────────
    /// <summary>PATCH /api/encounters/{id}/discharge-ipd</summary>
    [HttpPatch("api/encounters/{id}/discharge-ipd")]
    public async Task<IActionResult> DischargeIpd(string id)
    {
        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.Id == id && e.Type == 2 && e.DeletedDate == null);
        if (encounter is null) return NotFound("Encounter not found.");
        if (encounter.Status != 2) return BadRequest("Encounter is not in ADMITTED status.");

        encounter.Status        = 3;  // DISCHARGED
        encounter.DischargeDate = DateTime.UtcNow;

        // Release bed
        var bed = await db.Beds.FirstOrDefaultAsync(b => b.CurrentEncounterId == id);
        if (bed is not null)
        {
            bed.Status             = 1;  // AVAILABLE
            bed.CurrentEncounterId = null;
        }

        await db.SaveChangesAsync();
        return NoContent();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record AdmitRequest(
    string PatientId,
    string BedId,
    string? DivisionId,
    string? DoctorId,
    string? ChiefComplaint
);

public record AdmissionDto(
    string EncounterId,
    string EncounterNo,
    string Hn,
    string PatientName,
    string BedNo,
    string WardId,
    DateTime AdmissionDate
);

public record IpdEncounterItem(
    string EncounterId,
    string EncounterNo,
    string Hn,
    string PatientName,
    string? BedNumber,
    string DivisionId,
    int Status,
    DateTime AdmissionDate,
    DateTime? DischargeDate
);

public record IpdEncounterDetail(
    string EncounterId,
    string EncounterNo,
    string Hn,
    string PatientName,
    DateOnly? Birthdate,
    string? BedNumber,
    string? WardId,
    string DivisionId,
    string? DoctorId,
    string? DoctorName,
    string? ChiefComplaint,
    int Status,
    DateTime AdmissionDate,
    DateTime? DischargeDate,
    List<DiagnosisItem> Diagnoses
);

public record DiagnosisItem(string Id, string Code, string NameTh, int Type);

public record TransferRequest(string NewBedId);
