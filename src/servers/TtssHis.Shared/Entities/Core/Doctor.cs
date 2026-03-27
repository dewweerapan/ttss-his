using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Core;

[Comment("แพทย์")]
public sealed class Doctor
{
    [Comment("รหัสแพทย์ (UUID)")]
    public required string Id { get; set; }

    [Comment("รหัสใบประกอบวิชาชีพ")]
    public string? LicenseNumber { get; set; }

    [Comment("คำนำหน้า (ไทย)")]
    public string? PreName { get; set; }

    [Comment("ชื่อ (ไทย)")]
    public required string FirstName { get; set; }

    [Comment("นามสกุล (ไทย)")]
    public required string LastName { get; set; }

    [Comment("คำนำหน้า (อังกฤษ)")]
    public string? PreNameEn { get; set; }

    [Comment("ชื่อ (อังกฤษ)")]
    public string? FirstNameEn { get; set; }

    [Comment("นามสกุล (อังกฤษ)")]
    public string? LastNameEn { get; set; }

    [Comment("เพศ: M=1, F=2")]
    public int Gender { get; set; } = 1;

    [Comment("ความเชี่ยวชาญ")]
    public string? Specialty { get; set; }

    public bool IsActive { get; set; } = true;
    public string? CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }
}
