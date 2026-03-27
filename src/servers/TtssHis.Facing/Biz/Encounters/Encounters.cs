// src/servers/TtssHis.Facing/Biz/Encounters/Encounters.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Encounter;
using TtssHis.Shared.Entities.Medical;
using TtssHis.Shared.Entities.Queue;

namespace TtssHis.Facing.Biz.Encounters;

[ApiController]
[Route("api/encounters")]
[Authorize]
public sealed class Encounters(HisDbContext db) : ControllerBase
{
    // ── LIST ──────────────────────────────────────────────────────────────
    [HttpGet]
    public ActionResult<EncounterListResponse> List(
        [FromQuery] string? divisionId,
        [FromQuery] int? status,
        [FromQuery] string? date)
    {
        var targetDate = date is not null
            ? DateOnly.Parse(date)
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var items = db.Encounters
            .Where(e => e.IsActive && e.DeletedDate == null
                && DateOnly.FromDateTime(e.AdmissionDate) == targetDate)
            .Where(e => divisionId == null || e.DivisionId == divisionId)
            .Where(e => status == null || e.Status == status)
            .OrderBy(e => e.AdmissionDate)
            .Select(e => new EncounterItem(
                e.Id,
                e.EncounterNo,
                e.PatientId,
                e.Patient!.Hn,
                (e.Patient.PreName ?? "") + e.Patient.FirstName + " " + e.Patient.LastName,
                e.Status,
                e.Type,
                e.DivisionId,
                e.DoctorId,
                e.ChiefComplaint,
                e.AdmissionDate,
                e.QueueItem != null ? e.QueueItem.QueueNo : null,
                e.QueueItem != null ? e.QueueItem.Status : (int?)null
            ))
            .ToList();

        return Ok(new EncounterListResponse(items));
    }

    // ── CREATE ────────────────────────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<EncounterDetail>> Create([FromBody] CreateEncounterRequest req)
    {
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == req.PatientId && p.IsActive);
        if (patient is null) return NotFound("Patient not found.");

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var encounterCount = db.Encounters.Count(e => e.EncounterNo.StartsWith("VN" + today));
        var encounterNo = $"VN{today}{(encounterCount + 1):D5}";

        var queueCount = db.QueueItems
            .Count(q => q.DivisionId == req.DivisionId
                && DateOnly.FromDateTime(q.CreatedDate) == DateOnly.FromDateTime(DateTime.UtcNow));
        var queueNo = $"A{(queueCount + 1):D3}";

        var encounter = new Encounter
        {
            Id            = Guid.NewGuid().ToString(),
            EncounterNo   = encounterNo,
            PatientId     = req.PatientId,
            Type          = req.Type ?? 1,
            Status        = 1,
            DivisionId    = req.DivisionId,
            AdmissionDate = DateTime.UtcNow,
            CreatedBy     = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            CreatedDate   = DateTime.UtcNow,
            IsActive      = true,
        };
        db.Encounters.Add(encounter);

        var queueItem = new QueueItem
        {
            Id          = Guid.NewGuid().ToString(),
            QueueNo     = queueNo,
            EncounterId = encounter.Id,
            DivisionId  = req.DivisionId,
            Status      = 1,
            CreatedDate = DateTime.UtcNow,
        };
        db.QueueItems.Add(queueItem);

        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = encounter.Id }, await BuildDetail(encounter.Id));
    }

    // ── GET DETAIL ────────────────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<ActionResult<EncounterDetail>> Get(string id)
    {
        var detail = await BuildDetail(id);
        if (detail is null) return NotFound();
        return Ok(detail);
    }

    // ── TRIAGE (nurse: chief complaint + vitals) ──────────────────────────
    [HttpPatch("{id}/triage")]
    public async Task<ActionResult<EncounterDetail>> Triage(string id, [FromBody] TriageRequest req)
    {
        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.Id == id && e.DeletedDate == null);
        if (encounter is null) return NotFound();

        if (!string.IsNullOrWhiteSpace(req.ChiefComplaint))
            encounter.ChiefComplaint = req.ChiefComplaint;
        encounter.LastUpdatedDate = DateTime.UtcNow;
        encounter.UpdatedBy = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var vital = new VitalSign
        {
            Id                     = Guid.NewGuid().ToString(),
            EncounterId            = id,
            Temperature            = req.Temperature,
            PulseRate              = req.PulseRate,
            RespiratoryRate        = req.RespiratoryRate,
            BloodPressureSystolic  = req.BpSystolic,
            BloodPressureDiastolic = req.BpDiastolic,
            OxygenSaturation       = req.O2Sat,
            Weight                 = req.Weight,
            Height                 = req.Height,
            RecordedBy             = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            RecordedDate           = DateTime.UtcNow,
        };
        db.VitalSigns.Add(vital);

        await db.SaveChangesAsync();
        return Ok(await BuildDetail(id));
    }

    // ── CONSULT (doctor: assign self) ─────────────────────────────────────
    [HttpPatch("{id}/consult")]
    public async Task<ActionResult<EncounterDetail>> Consult(string id, [FromBody] ConsultRequest req)
    {
        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.Id == id && e.DeletedDate == null);
        if (encounter is null) return NotFound();

        encounter.DoctorId        = req.DoctorId;
        encounter.LastUpdatedDate = DateTime.UtcNow;
        encounter.UpdatedBy       = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        await db.SaveChangesAsync();
        return Ok(await BuildDetail(id));
    }

    // ── DISCHARGE ─────────────────────────────────────────────────────────
    [HttpPatch("{id}/discharge")]
    public async Task<IActionResult> Discharge(string id)
    {
        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.Id == id && e.DeletedDate == null);
        if (encounter is null) return NotFound();
        if (encounter.Status == 4) return BadRequest("Encounter is already closed.");

        encounter.Status          = 4; // CLOSED
        encounter.DischargeDate   = DateTime.UtcNow;
        encounter.LastUpdatedDate = DateTime.UtcNow;
        encounter.UpdatedBy       = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── DIAGNOSES ─────────────────────────────────────────────────────────
    [HttpPost("{id}/diagnoses")]
    public async Task<ActionResult<DiagnosisInfo>> AddDiagnosis(string id, [FromBody] AddDiagnosisRequest req)
    {
        var encounter = await db.Encounters.FirstOrDefaultAsync(e => e.Id == id && e.DeletedDate == null);
        if (encounter is null) return NotFound("Encounter not found.");

        var diag = new Diagnosis
        {
            Id          = Guid.NewGuid().ToString(),
            EncounterId = id,
            Type        = req.Type ?? 1,
            Icd10Id     = req.Icd10Id,
            Description = req.Description,
            IsConfirmed = req.IsConfirmed ?? false,
            CreatedBy   = User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            CreatedDate = DateTime.UtcNow,
        };
        db.Diagnoses.Add(diag);
        await db.SaveChangesAsync();

        var icd = req.Icd10Id is not null
            ? await db.Icd10s.FirstOrDefaultAsync(i => i.Id == req.Icd10Id)
            : null;

        return Ok(new DiagnosisInfo(diag.Id, diag.Type, icd?.Code, icd?.Name, diag.Description, diag.IsConfirmed));
    }

    [HttpDelete("{id}/diagnoses/{diagId}")]
    public async Task<IActionResult> RemoveDiagnosis(string id, string diagId)
    {
        var diag = await db.Diagnoses.FirstOrDefaultAsync(d => d.Id == diagId && d.EncounterId == id && d.DeletedDate == null);
        if (diag is null) return NotFound();

        diag.DeletedDate = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── DRUG ORDERS for encounter ─────────────────────────────────────────
    [HttpGet("{encounterId}/drug-orders")]
    public ActionResult<IEnumerable<DrugOrderSummary>> ListDrugOrders(string encounterId)
    {
        var orders = db.DrugOrders
            .Where(o => o.EncounterId == encounterId)
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .OrderByDescending(o => o.OrderDate)
            .Select(o => new DrugOrderSummary(
                o.Id,
                o.OrderNo,
                o.Status,
                o.OrderDate,
                o.Items.Select(i => new DrugOrderLineItem(
                    i.Id, i.ProductId, i.Product!.Name,
                    i.Quantity, i.Frequency, i.DurationDays, i.Instruction, i.Unit ?? i.Product.Unit
                )).ToList()
            ))
            .ToList();

        return Ok(orders);
    }

    // ── PRIVATE HELPER ────────────────────────────────────────────────────
    private async Task<EncounterDetail?> BuildDetail(string id)
    {
        var e = await db.Encounters
            .Include(e => e.Patient)
            .Include(e => e.QueueItem)
            .Include(e => e.VitalSigns)
            .Include(e => e.Diagnoses.Where(d => d.DeletedDate == null))
                .ThenInclude(d => d.Icd10)
            .FirstOrDefaultAsync(e => e.Id == id && e.DeletedDate == null);

        if (e is null) return null;

        var latestVital = e.VitalSigns.OrderByDescending(v => v.RecordedDate).FirstOrDefault();

        return new EncounterDetail(
            e.Id,
            e.EncounterNo,
            new PatientInfo(e.Patient!.Id, e.Patient.Hn, e.Patient.PreName,
                e.Patient.FirstName, e.Patient.LastName, e.Patient.PhoneNumber, e.Patient.Birthdate),
            e.Status,
            e.Type,
            e.DivisionId,
            e.DoctorId,
            e.ChiefComplaint,
            e.AdmissionDate,
            e.DischargeDate,
            latestVital is null ? null : new VitalSignInfo(
                latestVital.Temperature, latestVital.PulseRate, latestVital.RespiratoryRate,
                latestVital.BloodPressureSystolic, latestVital.BloodPressureDiastolic,
                latestVital.OxygenSaturation, latestVital.Weight, latestVital.Height,
                latestVital.RecordedDate),
            e.QueueItem is null ? null : new QueueInfo(e.QueueItem.Id, e.QueueItem.QueueNo, e.QueueItem.Status),
            e.Diagnoses.Select(d => new DiagnosisInfo(
                d.Id, d.Type, d.Icd10?.Code, d.Icd10?.Name, d.Description, d.IsConfirmed))
        );
    }
}

// ── RECORDS ───────────────────────────────────────────────────────────────
public record EncounterItem(
    string Id, string EncounterNo, string PatientId, string Hn, string PatientName,
    int Status, int Type, string DivisionId, string? DoctorId, string? ChiefComplaint,
    DateTime AdmissionDate, string? QueueNo, int? QueueStatus);

public record EncounterListResponse(IEnumerable<EncounterItem> Items);

public record PatientInfo(string Id, string Hn, string? PreName, string FirstName, string LastName,
    string? PhoneNumber, DateOnly? Birthdate);

public record VitalSignInfo(decimal? Temperature, int? PulseRate, int? RespiratoryRate,
    int? BpSystolic, int? BpDiastolic, int? O2Sat, decimal? Weight, decimal? Height,
    DateTime RecordedDate);

public record QueueInfo(string Id, string QueueNo, int Status);

public record DiagnosisInfo(string Id, int Type, string? Icd10Code, string? Icd10Name,
    string? Description, bool IsConfirmed);

public record DrugOrderSummary(string Id, string OrderNo, int Status, DateTime OrderDate,
    IEnumerable<DrugOrderLineItem> Items);

public record DrugOrderLineItem(string Id, string ProductId, string ProductName,
    int Quantity, string Frequency, int DurationDays, string? Instruction, string? Unit);

public record EncounterDetail(
    string Id, string EncounterNo, PatientInfo Patient, int Status, int Type,
    string DivisionId, string? DoctorId, string? ChiefComplaint,
    DateTime AdmissionDate, DateTime? DischargeDate,
    VitalSignInfo? LatestVitals, QueueInfo? QueueItem,
    IEnumerable<DiagnosisInfo> Diagnoses);

public record CreateEncounterRequest(string PatientId, string DivisionId, int? Type);

public record TriageRequest(string? ChiefComplaint, decimal? Temperature, int? PulseRate,
    int? RespiratoryRate, int? BpSystolic, int? BpDiastolic, int? O2Sat,
    decimal? Weight, decimal? Height);

public record ConsultRequest(string DoctorId);

public record AddDiagnosisRequest(string? Icd10Id, int? Type, string? Description, bool? IsConfirmed);
