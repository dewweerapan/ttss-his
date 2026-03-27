// src/servers/TtssHis.Shared/Entities/Ipd/Bed.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Ipd;

[Comment("เตียงผู้ป่วย")]
public sealed class Bed
{
    public required string Id { get; set; }
    public required string BedNo { get; set; }
    public required string WardId { get; set; }
    public Ward? Ward { get; set; }

    [Comment("AVAILABLE=1, OCCUPIED=2, MAINTENANCE=3")]
    public int Status { get; set; } = 1;

    public string? CurrentEncounterId { get; set; }
    public Encounter.Encounter? CurrentEncounter { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
}
