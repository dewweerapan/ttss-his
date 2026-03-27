// src/servers/TtssHis.Shared/Entities/Lab/LabOrder.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Lab;

[Comment("ใบส่งตรวจทางห้องปฏิบัติการ")]
public sealed class LabOrder
{
    public required string Id { get; set; }
    public required string OrderNo { get; set; }
    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    public string? OrderedBy { get; set; }

    [Comment("PENDING=1, RECEIVED=2, PROCESSING=3, COMPLETED=4, CANCELLED=9")]
    public int Status { get; set; } = 1;

    public DateTime RequestDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public string? Notes { get; set; }

    public ICollection<LabOrderItem> Items { get; set; } = [];
}
