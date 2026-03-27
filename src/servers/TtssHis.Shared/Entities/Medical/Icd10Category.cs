using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Medical;

[Comment("หมวดหมู่ ICD-10")]
public sealed class Icd10Category
{
    public required string Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? NameEn { get; set; }
    public string? ParentId { get; set; }
    public Icd10Category? Parent { get; set; }
    public ICollection<Icd10Category> Children { get; set; } = [];
}
