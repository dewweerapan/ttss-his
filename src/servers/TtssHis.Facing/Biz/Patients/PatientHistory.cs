// src/servers/TtssHis.Facing/Biz/Patients/PatientHistory.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing.Biz.Patients;

[ApiController]
[Authorize]
public sealed class PatientHistoryController(HisDbContext db) : ControllerBase
{
    /// <summary>GET /api/patients/{id}/history — full clinical history</summary>
    [HttpGet("api/patients/{patientId}/history")]
    public async Task<ActionResult<PatientHistoryDto>> GetHistory(string patientId)
    {
        var patient = await db.Patients
            .FirstOrDefaultAsync(p => p.Id == patientId && p.DeletedDate == null);
        if (patient is null) return NotFound();

        var encounters = await db.Encounters
            .Include(e => e.Doctor)
            .Include(e => e.Division)
            .Include(e => e.Diagnoses).ThenInclude(d => d.Icd10)
            .Include(e => e.VitalSigns)
            .Include(e => e.DrugOrders).ThenInclude(o => o.Items).ThenInclude(i => i.Product)
            .Include(e => e.Invoice)
            .Include(e => e.LabOrders).ThenInclude(o => o.Items).ThenInclude(i => i.Result)
            .Include(e => e.NursingNotes)
            .Include(e => e.DoctorOrders)
            .Where(e => e.PatientId == patientId && e.IsActive && e.DeletedDate == null)
            .OrderByDescending(e => e.AdmissionDate)
            .ToListAsync();

        var history = encounters.Select(e => new EncounterHistoryItem(
            e.Id,
            e.EncounterNo,
            e.Type,
            e.Status,
            e.Division?.Name ?? e.DivisionId,
            e.Doctor != null ? e.Doctor.FirstName + " " + e.Doctor.LastName : null,
            e.ChiefComplaint,
            e.AdmissionDate,
            e.DischargeDate,

            e.Diagnoses.Select(d => new DiagItem(d.Icd10?.Code ?? "", d.Icd10?.Name ?? "", d.Type)).ToList(),

            e.VitalSigns.OrderByDescending(v => v.RecordedDate).Select(v => new VitalItem(
                v.RecordedDate, v.Temperature, v.BloodPressureSystolic, v.BloodPressureDiastolic,
                v.PulseRate, v.RespiratoryRate, v.OxygenSaturation, v.Weight, v.Height
            )).ToList(),

            e.DrugOrders.Select(o => new DrugOrderItem(
                o.OrderNo, o.Status,
                o.Items.Select(i => new DrugItem(
                    i.Product?.Code ?? "", i.Product?.Name ?? "", i.Quantity, i.Unit ?? "", i.Instruction ?? "", i.Frequency
                )).ToList()
            )).ToList(),

            e.LabOrders.Select(o => new LabOrderItem(
                o.OrderNo, o.Status, o.RequestDate,
                o.Items.Select(i => new LabItem(
                    i.TestCode, i.TestName,
                    i.Result?.Value, i.Result?.IsAbnormal ?? false, i.Result?.ReferenceRange
                )).ToList()
            )).ToList(),

            e.Invoice != null ? new InvoiceItem(e.Invoice.InvoiceNo, e.Invoice.TotalAmount, e.Invoice.Status) : null
        )).ToList();

        return Ok(new PatientHistoryDto(
            patient.Id,
            patient.Hn,
            (patient.PreName ?? "") + patient.FirstName + " " + patient.LastName,
            patient.Birthdate,
            encounters.Count,
            history
        ));
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record PatientHistoryDto(
    string PatientId, string Hn, string FullName, DateOnly? Birthdate,
    int TotalEncounters, List<EncounterHistoryItem> Encounters
);

public record EncounterHistoryItem(
    string EncounterId, string EncounterNo, int Type, int Status,
    string Division, string? Doctor, string? ChiefComplaint,
    DateTime AdmissionDate, DateTime? DischargeDate,
    List<DiagItem> Diagnoses,
    List<VitalItem> VitalSigns,
    List<DrugOrderItem> DrugOrders,
    List<LabOrderItem> LabOrders,
    InvoiceItem? Invoice
);

public record DiagItem(string Code, string Name, int Type);
public record VitalItem(DateTime RecordedAt, decimal? Temperature, int? BpSystolic, int? BpDiastolic, int? HeartRate, int? RespRate, int? SpO2, decimal? Weight, decimal? Height);
public record DrugOrderItem(string OrderNo, int Status, List<DrugItem> Items);
public record DrugItem(string Code, string Name, int Quantity, string Unit, string Instruction, string Frequency);
public record LabOrderItem(string OrderNo, int Status, DateTime RequestDate, List<LabItem> Items);
public record LabItem(string TestCode, string TestName, string? Value, bool IsAbnormal, string? ReferenceRange);
public record InvoiceItem(string InvoiceNo, decimal TotalAmount, int Status);
