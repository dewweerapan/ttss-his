// src/servers/TtssHis.Shared/Entities/Billing/Receipt.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Billing;

[Comment("ใบเสร็จรับเงิน")]
public sealed class Receipt
{
    public required string Id { get; set; }

    [Comment("Running number: RCyyyyMMddNNNNN")]
    public required string ReceiptNo { get; set; }

    public required string InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }

    [Comment("CASH=1, CARD=2, TRANSFER=3")]
    public int PaymentMethod { get; set; } = 1;

    public decimal Amount { get; set; }
    public DateTime PaidAt { get; set; }
}
