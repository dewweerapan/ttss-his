// src/servers/TtssHis.Shared/Entities/Billing/Invoice.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Billing;

[Comment("ใบแจ้งหนี้")]
public sealed class Invoice
{
    public required string Id { get; set; }

    [Comment("Running number: INVyyyyMMddNNNNN")]
    public required string InvoiceNo { get; set; }

    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("PENDING=1, PAID=2, CANCELED=9")]
    public int Status { get; set; } = 1;

    public decimal TotalAmount { get; set; }
    public DateTime IssuedAt { get; set; }
    public DateTime? PaidAt { get; set; }

    public ICollection<InvoiceItem> Items { get; set; } = [];
    public Receipt? Receipt { get; set; }
}
