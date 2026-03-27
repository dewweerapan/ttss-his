using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.Entities.Insurance;

namespace TtssHis.Shared.Entities.Patient;

[Comment("สิทธิการรักษาของผู้ป่วย")]
public sealed class PatientCoverage
{
    public required string Id { get; set; }
    public required string PatientId { get; set; }
    public Patient? Patient { get; set; }
    public required string CoverageId { get; set; }
    public Coverage? Coverage { get; set; }
    public string? PayerId { get; set; }
    public Payer? Payer { get; set; }
    public DateOnly? EffectiveDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }
}
