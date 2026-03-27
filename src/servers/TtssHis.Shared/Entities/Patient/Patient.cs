using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Patient;

[Comment("ข้อมูลผู้ป่วย")]
public sealed class Patient
{
    [Comment("รหัสผู้ป่วย (UUID)")]
    public required string Id { get; set; }

    [Comment("หมายเลขผู้ป่วย HN")]
    public required string Hn { get; set; }

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

    [Comment("เพศ: M=1, F=2, U=3")]
    public int Gender { get; set; } = 3;

    [Comment("วันเกิด")]
    public DateOnly? Birthdate { get; set; }

    [Comment("ประเภทบัตร: T=ไทย, F=ต่างชาติ, A=ไม่มีสัญชาติ, N=ไม่มีบัตร")]
    public string CitizenType { get; set; } = "T";

    [Comment("เลขบัตรประชาชน 13 หลัก")]
    public string? CitizenNo { get; set; }

    [Comment("เลขพาสปอร์ต")]
    public string? PassportNo { get; set; }

    [Comment("กรุ๊ปเลือด")]
    public string? BloodGroup { get; set; }

    [Comment("สัญชาติ รหัส 3 หลัก (099 = ไทย)")]
    public string NationalityCode { get; set; } = "099";

    [Comment("ศาสนา")]
    public string? Religion { get; set; }

    [Comment("อาชีพ")]
    public string? Occupation { get; set; }

    [Comment("เบอร์โทรศัพท์")]
    public string? PhoneNumber { get; set; }

    [Comment("แพ้ยา / แพ้สาร (ชื่อยาหรือสารคั่นด้วยจุลภาค)")]
    public string? Allergy { get; set; }

    [Comment("รายละเอียดอาการแพ้")]
    public string? AllergyNote { get; set; }

    public bool IsAlive { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? LastUpdatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }

    public ICollection<PatientAddress> Addresses { get; set; } = [];
    public ICollection<PatientCoverage> Coverages { get; set; } = [];
}
