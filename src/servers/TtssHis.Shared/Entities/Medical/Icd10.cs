using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Medical;

[Comment("รหัส ICD-10 วินิจฉัยโรค")]
public sealed class Icd10
{
    public required string Id { get; set; }

    [Comment("รหัส เช่น A00, J18.9")]
    public required string Code { get; set; }

    [Comment("ชื่อโรค (ไทย)")]
    public required string Name { get; set; }

    [Comment("ชื่อโรค (อังกฤษ)")]
    public string? NameEn { get; set; }

    public string? CategoryId { get; set; }
    public Icd10Category? Category { get; set; }

    public bool IsActive { get; set; } = true;
}
