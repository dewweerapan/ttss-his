// src/servers/TtssHis.Shared/Entities/Ipd/DoctorOrder.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Ipd;

[Comment("คำสั่งแพทย์ (IPD)")]
public sealed class DoctorOrder
{
    public required string Id { get; set; }
    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("MEDICATION=1, DIET=2, ACTIVITY=3, INVESTIGATION=4, PROCEDURE=5, OTHER=9")]
    public int OrderType { get; set; } = 9;

    public required string OrderContent { get; set; }
    public string? DoctorId { get; set; }

    [Comment("ACTIVE=1, COMPLETED=2, CANCELLED=9")]
    public int Status { get; set; } = 1;

    public DateTime OrderDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
}
