// src/servers/TtssHis.Shared/Entities/Specialized/DialysisSession.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Specialized;

[Comment("บันทึกการฟอกไต")]
public sealed class DialysisSession
{
    public required string Id           { get; set; }
    public required string EncounterId  { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("HD=1, HDF=2, CRRT=3, PD=4")]
    public int DialysisType             { get; set; } = 1;
    public string? MachineNo            { get; set; }

    [Comment("SCHEDULED=1, IN_PROGRESS=2, COMPLETED=3, CANCELLED=9")]
    public int Status                   { get; set; } = 1;
    public DateTime ScheduledAt         { get; set; }
    public DateTime? StartedAt          { get; set; }
    public DateTime? EndedAt            { get; set; }
    public decimal? PreWeight           { get; set; }
    public decimal? PostWeight          { get; set; }
    public decimal? UfGoal              { get; set; }  // Ultrafiltration goal (mL)
    public decimal? UfAchieved          { get; set; }
    public string? AccessType           { get; set; }  // AVF, CVC, etc.
    public string? Complications        { get; set; }
    public string? Notes                { get; set; }
    public string? NurseId              { get; set; }
}
