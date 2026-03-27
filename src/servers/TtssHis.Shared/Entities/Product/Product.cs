using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Product;

[Comment("สินค้า/บริการ (ยา, หัตถการ, Supplies)")]
public sealed class Product
{
    public required string Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? NameEn { get; set; }

    [Comment("ประเภท: MEDICINE=1, SERVICE=2, SUPPLY=3, EQUIPMENT=4, PACKAGE=5")]
    public int Type { get; set; } = 1;

    [Comment("หน่วย เช่น เม็ด, ขวด, ครั้ง")]
    public string? Unit { get; set; }

    [Comment("จำนวนคงเหลือในคลัง")]
    public int StockQuantity { get; set; } = 0;

    [Comment("จำนวนขั้นต่ำที่ควรแจ้งเตือน")]
    public int ReorderLevel { get; set; } = 10;

    public bool IsBillable { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }

    public ICollection<Pricing> Pricings { get; set; } = [];
}
