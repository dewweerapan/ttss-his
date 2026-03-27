// src/servers/TtssHis.Shared/Entities/Pharmacy/DrugOrderItem.cs
namespace TtssHis.Shared.Entities.Pharmacy;

public sealed class DrugOrderItem
{
    public required string Id { get; set; }

    public required string DrugOrderId { get; set; }
    public DrugOrder? DrugOrder { get; set; }

    public required string ProductId { get; set; }
    public Product.Product? Product { get; set; }

    public int Quantity { get; set; }

    /// <summary>OD / BID / TID / QID / PRN</summary>
    public required string Frequency { get; set; }

    public int DurationDays { get; set; }
    public string? Instruction { get; set; }

    /// <summary>หน่วยนับ เช่น เม็ด แคปซูล</summary>
    public string? Unit { get; set; }
}
