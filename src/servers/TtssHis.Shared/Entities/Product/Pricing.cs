using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.Entities.Insurance;

namespace TtssHis.Shared.Entities.Product;

[Comment("ราคาสินค้า/บริการ")]
public sealed class Pricing
{
    public required string Id { get; set; }
    public required string ProductId { get; set; }
    public Product? Product { get; set; }

    [Comment("ราคาปกติ")]
    public decimal PriceNormal { get; set; }

    [Comment("ราคาพิเศษ")]
    public decimal PriceSpecial { get; set; }

    [Comment("ราคาต่างชาติ")]
    public decimal PriceForeign { get; set; }

    [Comment("สิทธิที่ใช้ราคานี้ (null = ราคา default)")]
    public string? CoverageId { get; set; }
    public Coverage? Coverage { get; set; }

    public DateOnly EffectiveDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }
}
