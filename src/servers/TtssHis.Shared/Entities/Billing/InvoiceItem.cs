// src/servers/TtssHis.Shared/Entities/Billing/InvoiceItem.cs
namespace TtssHis.Shared.Entities.Billing;

public sealed class InvoiceItem
{
    public required string Id { get; set; }

    public required string InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    public string? ProductId { get; set; }
    public Product.Product? Product { get; set; }

    /// <summary>FK ไปยัง DrugOrderItem (null = ค่าบริการทั่วไป)</summary>
    public string? DrugOrderItemId { get; set; }

    public required string Description { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal TotalPrice { get; set; }
}
