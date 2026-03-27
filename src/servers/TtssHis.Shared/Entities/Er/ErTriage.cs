// src/servers/TtssHis.Shared/Entities/Er/ErTriage.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Er;

[Comment("การคัดกรองผู้ป่วยฉุกเฉิน")]
public sealed class ErTriage
{
    public required string Id { get; set; }
    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("ระดับความเร่งด่วน: P1=Critical=1, P2=Urgent=2, P3=SemiUrgent=3, P4=NonUrgent=4")]
    public int Severity { get; set; } = 3;

    [Comment("วิธีมาถึง: WALK=1, AMBULANCE=2, REFER=3, OTHER=9")]
    public int ArrivalMode { get; set; } = 1;

    public string? TriageNotes { get; set; }
    public string? TriageBy { get; set; }
    public DateTime TriageTime { get; set; }

    [Comment("การส่งต่อ: DISCHARGE=1, ADMIT=2, REFER=3, DECEASED=9")]
    public int? Disposition { get; set; }
    public DateTime? DispositionTime { get; set; }
}
