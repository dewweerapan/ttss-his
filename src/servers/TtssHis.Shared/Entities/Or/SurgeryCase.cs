// src/servers/TtssHis.Shared/Entities/Or/SurgeryCase.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Or;

[Comment("ตารางผ่าตัด")]
public sealed class SurgeryCase
{
    public required string Id             { get; set; }
    public required string EncounterId   { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    public required string ProcedureName { get; set; }
    public string? OperatingRoom         { get; set; }

    [Comment("SCHEDULED=1, IN_PROGRESS=2, COMPLETED=3, CANCELLED=9")]
    public int Status                    { get; set; } = 1;

    public DateTime ScheduledAt          { get; set; }
    public DateTime? StartedAt           { get; set; }
    public DateTime? EndedAt             { get; set; }
    public string? SurgeonId             { get; set; }
    public string? SurgeonName           { get; set; }
    public string? AnesthesiaType        { get; set; }
    public string? AnesthesiologistName  { get; set; }
    public string? PreOpDiagnosis        { get; set; }
    public string? PostOpDiagnosis       { get; set; }
    public string? OperativeNotes        { get; set; }
    public DateTime CreatedDate          { get; set; }
}
