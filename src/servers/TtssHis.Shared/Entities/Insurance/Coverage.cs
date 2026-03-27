using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Insurance;

[Comment("สิทธิการรักษา")]
public sealed class Coverage
{
    public required string Id { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public string? NameEn { get; set; }

    [Comment("ประเภทสิทธิ: GOVERNMENT=1, PRIVATE=2, SELF_PAY=3, EMPLOYEE=4")]
    public int Type { get; set; } = 3;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }

    public ICollection<Payer> Payers { get; set; } = [];
}
