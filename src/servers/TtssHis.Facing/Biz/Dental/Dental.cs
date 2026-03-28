// src/servers/TtssHis.Facing/Biz/Dental/Dental.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Dental;

namespace TtssHis.Facing.Biz.Dental;

[ApiController]
[Authorize]
public sealed class Dental(HisDbContext db) : ControllerBase
{
    /// <summary>GET /api/dental-records?patientId=&encounterId=</summary>
    [HttpGet("api/dental-records")]
    public async Task<ActionResult<IEnumerable<DentalRecordDto>>> List(
        [FromQuery] string? encounterId = null,
        [FromQuery] string? patientId = null)
    {
        var q = db.DentalRecords
            .Include(d => d.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();

        if (encounterId is not null)
            q = q.Where(d => d.EncounterId == encounterId);
        else if (patientId is not null)
            q = q.Where(d => d.Encounter!.PatientId == patientId);

        var items = await q.OrderByDescending(d => d.VisitDate)
            .Select(d => ToDto(d))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>POST /api/dental-records</summary>
    [HttpPost("api/dental-records")]
    public async Task<ActionResult<DentalRecordDto>> Create([FromBody] CreateDentalRecordReq req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == req.EncounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var dr = new DentalRecord
        {
            Id            = Guid.NewGuid().ToString(),
            EncounterId   = req.EncounterId,
            ProcedureType = req.ProcedureType,
            ToothNumbers  = req.ToothNumbers,
            ChiefComplaint = req.ChiefComplaint,
            Findings      = req.Findings,
            Treatment     = req.Treatment,
            Materials     = req.Materials,
            DentistName   = req.DentistName,
            NextAppointment = req.NextAppointment,
            VisitDate     = DateTime.UtcNow,
        };
        db.DentalRecords.Add(dr);
        await db.SaveChangesAsync();
        return Ok(ToDto(dr));
    }

    /// <summary>DELETE /api/dental-records/{id}</summary>
    [HttpDelete("api/dental-records/{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var dr = await db.DentalRecords.FirstOrDefaultAsync(d => d.Id == id);
        if (dr is null) return NotFound();
        db.DentalRecords.Remove(dr);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static DentalRecordDto ToDto(DentalRecord d) => new(
        d.Id, d.EncounterId,
        d.Encounter?.Patient != null
            ? (d.Encounter.Patient.PreName ?? "") + d.Encounter.Patient.FirstName + " " + d.Encounter.Patient.LastName
            : null,
        d.Encounter?.Patient?.Hn,
        d.ProcedureType, d.ToothNumbers, d.ChiefComplaint,
        d.Findings, d.Treatment, d.Materials, d.DentistName, d.NextAppointment, d.VisitDate
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record CreateDentalRecordReq(
    string EncounterId, int ProcedureType, string? ToothNumbers,
    string? ChiefComplaint, string? Findings, string? Treatment,
    string? Materials, string? DentistName, string? NextAppointment
);
public record DentalRecordDto(
    string Id, string EncounterId, string? PatientName, string? Hn,
    int ProcedureType, string? ToothNumbers, string? ChiefComplaint,
    string? Findings, string? Treatment, string? Materials,
    string? DentistName, string? NextAppointment, DateTime VisitDate
);
