// src/servers/TtssHis.Shared/Entities/Claims/InsuranceClaim.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Claims;

[Comment("การเรียกเก็บเงินจากประกัน/สิทธิ์")]
public sealed class InsuranceClaim
{
    public required string Id            { get; set; }
    public required string EncounterId   { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    public string? CoverageId            { get; set; }
    public string? ClaimNo               { get; set; }
    public decimal ClaimAmount           { get; set; }
    public decimal? ApprovedAmount       { get; set; }

    [Comment("DRAFT=1, SUBMITTED=2, APPROVED=3, REJECTED=4, PAID=5")]
    public int Status                    { get; set; } = 1;
    public string? RejectionReason       { get; set; }
    public DateTime ClaimDate            { get; set; }
    public DateTime? SubmittedAt         { get; set; }
    public DateTime? ProcessedAt         { get; set; }
    public string? Notes                 { get; set; }
}
