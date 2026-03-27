// src/servers/TtssHis.Shared/Entities/Pharmacy/DrugOrder.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Pharmacy;

[Comment("ใบสั่งยา")]
public sealed class DrugOrder
{
    public required string Id { get; set; }

    [Comment("Running number: RXyyyyMMddNNNNN")]
    public required string OrderNo { get; set; }

    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    public string? DoctorId { get; set; }

    [Comment("PENDING=1, VERIFIED=2, DISPENSED=3, CANCELED=9")]
    public int Status { get; set; } = 1;

    public DateTime OrderDate { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public DateTime? DispensedAt { get; set; }
    public string? Notes { get; set; }

    public ICollection<DrugOrderItem> Items { get; set; } = [];
}
