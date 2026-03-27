using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.Entities.Medical;

namespace TtssHis.Shared.Entities.Encounter;

[Comment("การวินิจฉัยโรค")]
public sealed class Diagnosis
{
    public required string Id { get; set; }
    public required string EncounterId { get; set; }
    public Encounter? Encounter { get; set; }

    [Comment("ประเภท: PRINCIPAL=1, COMORBIDITY=2, COMPLICATION=3, RULE_OUT=4")]
    public int Type { get; set; } = 1;

    public string? Icd10Id { get; set; }
    public Icd10? Icd10 { get; set; }

    public string? Description { get; set; }
    public bool IsConfirmed { get; set; } = false;
    public string? CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
    public DateTime? DeletedDate { get; set; }
}
