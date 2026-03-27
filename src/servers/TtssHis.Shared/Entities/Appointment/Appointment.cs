// src/servers/TtssHis.Shared/Entities/Appointment/Appointment.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Appointment;

[Comment("การนัดหมายผู้ป่วย")]
public sealed class Appointment
{
    public required string Id { get; set; }
    public required string PatientId { get; set; }
    public Patient.Patient? Patient { get; set; }

    public string? DoctorId { get; set; }
    public Core.Doctor? Doctor { get; set; }

    public required string DivisionId { get; set; }
    public Core.Division? Division { get; set; }

    public DateTime ScheduledDate { get; set; }

    [Comment("ช่วงเวลา: MORNING=1, AFTERNOON=2, EVENING=3")]
    public int TimeSlot { get; set; } = 1;

    [Comment("ประเภทนัด: FOLLOW_UP=1, NEW=2, PROCEDURE=3, LAB=4, OTHER=9")]
    public int AppointmentType { get; set; } = 1;

    public string? Purpose { get; set; }
    public string? Notes { get; set; }

    [Comment("SCHEDULED=1, CONFIRMED=2, ARRIVED=3, COMPLETED=4, CANCELLED=9, NO_SHOW=8")]
    public int Status { get; set; } = 1;

    public string? CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? CancelledDate { get; set; }
    public string? CancelReason { get; set; }
}
