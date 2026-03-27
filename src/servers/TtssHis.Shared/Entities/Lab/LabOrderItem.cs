// src/servers/TtssHis.Shared/Entities/Lab/LabOrderItem.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Lab;

[Comment("รายการตรวจ")]
public sealed class LabOrderItem
{
    public required string Id { get; set; }
    public required string LabOrderId { get; set; }
    public LabOrder? LabOrder { get; set; }

    public required string TestCode { get; set; }
    public required string TestName { get; set; }
    public string? Unit { get; set; }
    public string? ReferenceRange { get; set; }

    public LabResult? Result { get; set; }
}
