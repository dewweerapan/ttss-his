using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Core;

[Comment("บทบาทผู้ใช้งาน")]
public sealed class Role
{
    [Comment("รหัสบทบาท")]
    public required string Id { get; set; }

    [Comment("ชื่อบทบาท")]
    public required string Name { get; set; }

    [Comment("รายละเอียด")]
    public string? Description { get; set; }

    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }

    public ICollection<User> Users { get; set; } = [];
}
