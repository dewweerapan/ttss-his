// src/servers/TtssHis.Shared/Entities/Lab/LabResult.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Lab;

[Comment("ผลการตรวจ")]
public sealed class LabResult
{
    public required string Id { get; set; }
    public required string LabOrderItemId { get; set; }
    public LabOrderItem? LabOrderItem { get; set; }

    public required string Value { get; set; }
    public string? ReferenceRange { get; set; }
    public bool IsAbnormal { get; set; }
    public string? EnteredBy { get; set; }
    public DateTime ResultDate { get; set; }
    public string? Notes { get; set; }
}
