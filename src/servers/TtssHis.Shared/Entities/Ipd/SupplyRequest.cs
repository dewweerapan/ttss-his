// src/servers/TtssHis.Shared/Entities/Ipd/SupplyRequest.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Ipd;

[Comment("คำขอเวชภัณฑ์/อุปกรณ์ประจำหอผู้ป่วย")]
public sealed class SupplyRequest
{
    public required string Id          { get; set; }
    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    public required string ItemName    { get; set; }
    public string? ProductId           { get; set; }
    public int Quantity                { get; set; } = 1;
    public string? Notes               { get; set; }

    [Comment("REQUESTED=1, DISPENSED=2, CANCELLED=9")]
    public int Status                  { get; set; } = 1;
    public DateTime RequestDate        { get; set; }
    public string? RequestedBy         { get; set; }
    public DateTime? DispensedAt       { get; set; }
    public string? DispensedBy         { get; set; }
}
