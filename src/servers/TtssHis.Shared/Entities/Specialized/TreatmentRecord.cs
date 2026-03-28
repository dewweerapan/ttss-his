// src/servers/TtssHis.Shared/Entities/Specialized/TreatmentRecord.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Specialized;

[Comment("บันทึกการรักษาในห้องทำหัตถการ")]
public sealed class TreatmentRecord
{
    public required string Id           { get; set; }
    public required string EncounterId  { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("WOUND_CARE=1, IV_INFUSION=2, PHYSIOTHERAPY=3, INJECTION=4, DRESSING=5, OTHER=9")]
    public int TreatmentType            { get; set; } = 9;
    public required string Description  { get; set; }
    public string? Materials            { get; set; }
    public string? PerformedBy          { get; set; }

    [Comment("PENDING=1, COMPLETED=2, CANCELLED=9")]
    public int Status                   { get; set; } = 1;
    public DateTime ScheduledAt         { get; set; }
    public DateTime? CompletedAt        { get; set; }
    public string? OutcomeNotes         { get; set; }
}
