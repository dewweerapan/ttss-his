using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Core;

[Comment("แผนก/หน่วยงาน")]
public sealed class Division
{
    [Comment("รหัสแผนก (UUID)")]
    public required string Id { get; set; }

    [Comment("รหัสย่อแผนก เช่น OPD, LAB")]
    public required string Code { get; set; }

    [Comment("ชื่อแผนก (ไทย)")]
    public required string Name { get; set; }

    [Comment("ชื่อแผนก (อังกฤษ)")]
    public string? NameEn { get; set; }

    [Comment("ประเภท: OPD=1, IPD=2, ER=3, PHARMACY=4, LAB=5, BILLING=6, OTHER=9")]
    public int Type { get; set; } = 9;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }
}
