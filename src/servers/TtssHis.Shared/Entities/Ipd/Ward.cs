// src/servers/TtssHis.Shared/Entities/Ipd/Ward.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Ipd;

[Comment("หอผู้ป่วย")]
public sealed class Ward
{
    public required string Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }

    [Comment("GENERAL=1, ICU=2, PEDIATRIC=3, SURGICAL=4, OB=5")]
    public int Type { get; set; } = 1;

    public int TotalBeds { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }

    public ICollection<Bed> Beds { get; set; } = [];
}
