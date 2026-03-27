using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Insurance;

[Comment("ผู้รับผิดชอบค่าใช้จ่าย (บริษัทประกัน / ภาครัฐ)")]
public sealed class Payer
{
    public required string Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? CoverageId { get; set; }
    public Coverage? Coverage { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }
}
