using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Core;

[Comment("ผู้ใช้งานระบบ")]
public sealed class User
{
    [Comment("รหัสผู้ใช้งาน")]
    public required string Id { get; set; }

    [Comment("ชื่อผู้ใช้งาน (login)")]
    public required string Username { get; set; }

    [Comment("รหัสผ่าน (bcrypt hash)")]
    public required string PasswordHash { get; set; }

    [Comment("ชื่อจริง")]
    public required string FirstName { get; set; }

    [Comment("นามสกุล")]
    public required string LastName { get; set; }

    [Comment("รหัสบทบาท")]
    public required string RoleId { get; set; }

    [Comment("บทบาท")]
    public Role? Role { get; set; }

    [Comment("รหัสแพทย์ (ถ้าเป็นหมอ)")]
    public string? DoctorId { get; set; }

    [Comment("แพทย์ที่เชื่อมกับ user นี้")]
    public Doctor? Doctor { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }
}
