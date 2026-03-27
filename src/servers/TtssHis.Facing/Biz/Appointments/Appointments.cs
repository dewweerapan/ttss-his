// src/servers/TtssHis.Facing/Biz/Appointments/Appointments.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Appointment;

namespace TtssHis.Facing.Biz.Appointments;

[ApiController]
[Authorize]
public sealed class AppointmentsController(HisDbContext db) : ControllerBase
{
    // ── LIST ──────────────────────────────────────────────────────────────
    /// <summary>GET /api/appointments — list appointments with filters</summary>
    [HttpGet("api/appointments")]
    public ActionResult<IEnumerable<AppointmentDto>> List(
        [FromQuery] string? date = null,
        [FromQuery] string? patientId = null,
        [FromQuery] string? doctorId = null,
        [FromQuery] int? status = null)
    {
        var query = db.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Include(a => a.Division)
            .AsQueryable();

        if (date is not null)
        {
            var d = DateOnly.Parse(date);
            query = query.Where(a => DateOnly.FromDateTime(a.ScheduledDate) == d);
        }
        if (patientId is not null) query = query.Where(a => a.PatientId == patientId);
        if (doctorId   is not null) query = query.Where(a => a.DoctorId == doctorId);
        if (status     is not null) query = query.Where(a => a.Status == status.Value);
        else query = query.Where(a => a.Status < 9); // exclude cancelled by default

        var items = query
            .OrderBy(a => a.ScheduledDate).ThenBy(a => a.TimeSlot)
            .Select(a => ToDto(a))
            .ToList();

        return Ok(items);
    }

    // ── GET BY PATIENT ────────────────────────────────────────────────────
    /// <summary>GET /api/patients/{id}/appointments</summary>
    [HttpGet("api/patients/{patientId}/appointments")]
    public ActionResult<IEnumerable<AppointmentDto>> GetByPatient(string patientId)
    {
        var items = db.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Include(a => a.Division)
            .Where(a => a.PatientId == patientId)
            .OrderByDescending(a => a.ScheduledDate)
            .Select(a => ToDto(a))
            .ToList();

        return Ok(items);
    }

    // ── CREATE ────────────────────────────────────────────────────────────
    /// <summary>POST /api/appointments — create appointment</summary>
    [HttpPost("api/appointments")]
    public async Task<ActionResult<AppointmentDto>> Create([FromBody] CreateAppointmentRequest req)
    {
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == req.PatientId && p.DeletedDate == null);
        if (patient is null) return NotFound("Patient not found.");

        var appt = new Appointment
        {
            Id              = Guid.NewGuid().ToString(),
            PatientId       = req.PatientId,
            DoctorId        = req.DoctorId,
            DivisionId      = req.DivisionId,
            ScheduledDate   = req.ScheduledDate,
            TimeSlot        = req.TimeSlot,
            AppointmentType = req.AppointmentType,
            Purpose         = req.Purpose,
            Notes           = req.Notes,
            Status          = 1,
            CreatedBy       = req.CreatedBy,
            CreatedDate     = DateTime.UtcNow,
        };

        db.Appointments.Add(appt);
        await db.SaveChangesAsync();

        // Reload with includes
        var created = await db.Appointments
            .Include(a => a.Patient)
            .Include(a => a.Doctor)
            .Include(a => a.Division)
            .FirstAsync(a => a.Id == appt.Id);

        return Ok(ToDto(created));
    }

    // ── UPDATE STATUS ─────────────────────────────────────────────────────
    /// <summary>PATCH /api/appointments/{id}/status</summary>
    [HttpPatch("api/appointments/{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateStatusRequest req)
    {
        var appt = await db.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appt is null) return NotFound();

        appt.Status = req.Status;

        if (req.Status == 9)
        {
            appt.CancelledDate = DateTime.UtcNow;
            appt.CancelReason  = req.Reason;
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── RESCHEDULE ────────────────────────────────────────────────────────
    /// <summary>PATCH /api/appointments/{id}/reschedule</summary>
    [HttpPatch("api/appointments/{id}/reschedule")]
    public async Task<IActionResult> Reschedule(string id, [FromBody] RescheduleRequest req)
    {
        var appt = await db.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appt is null) return NotFound();
        if (appt.Status == 9) return BadRequest("Cannot reschedule a cancelled appointment.");

        appt.ScheduledDate = req.ScheduledDate;
        appt.TimeSlot      = req.TimeSlot;
        appt.Status        = 1; // Reset to SCHEDULED

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── HELPER ────────────────────────────────────────────────────────────
    private static AppointmentDto ToDto(Appointment a) => new(
        a.Id,
        a.PatientId,
        a.Patient != null ? (a.Patient.PreName ?? "") + a.Patient.FirstName + " " + a.Patient.LastName : null,
        a.Patient?.Hn,
        a.DoctorId,
        a.Doctor != null ? a.Doctor.FirstName + " " + a.Doctor.LastName : null,
        a.DivisionId,
        a.Division?.Name,
        a.ScheduledDate,
        a.TimeSlot,
        a.AppointmentType,
        a.Purpose,
        a.Notes,
        a.Status,
        a.CreatedDate
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record AppointmentDto(
    string Id, string PatientId, string? PatientName, string? Hn,
    string? DoctorId, string? DoctorName,
    string DivisionId, string? DivisionName,
    DateTime ScheduledDate, int TimeSlot, int AppointmentType,
    string? Purpose, string? Notes, int Status, DateTime CreatedDate
);

public record CreateAppointmentRequest(
    string PatientId, string? DoctorId, string DivisionId,
    DateTime ScheduledDate, int TimeSlot, int AppointmentType,
    string? Purpose, string? Notes, string? CreatedBy
);

public record UpdateStatusRequest(int Status, string? Reason);
public record RescheduleRequest(DateTime ScheduledDate, int TimeSlot);
