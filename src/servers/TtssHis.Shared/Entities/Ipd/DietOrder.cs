// src/servers/TtssHis.Shared/Entities/Ipd/DietOrder.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Ipd;

[Comment("คำสั่งอาหารผู้ป่วยใน")]
public sealed class DietOrder
{
    public required string Id          { get; set; }
    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("REGULAR=1, SOFT=2, LIQUID=3, DIABETIC=4, LOW_SALT=5, OTHER=9")]
    public int DietType { get; set; } = 1;

    [Comment("ALL=1, BREAKFAST=2, LUNCH=3, DINNER=4")]
    public int Meal     { get; set; } = 1;

    public string? Notes      { get; set; }

    [Comment("ACTIVE=1, CANCELLED=9")]
    public int Status          { get; set; } = 1;
    public DateTime OrderDate  { get; set; }
    public string? OrderedBy   { get; set; }
    public DateTime? CancelledAt { get; set; }
}
