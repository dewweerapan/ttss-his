using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Patient;

[Comment("ที่อยู่ผู้ป่วย")]
public sealed class PatientAddress
{
    public required string Id { get; set; }
    public required string PatientId { get; set; }
    public Patient? Patient { get; set; }

    [Comment("ประเภทที่อยู่: HOME, WORK, CURRENT")]
    public string AddressType { get; set; } = "HOME";

    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? SubDistrict { get; set; }
    public string? District { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsPrimary { get; set; } = false;
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }
}
