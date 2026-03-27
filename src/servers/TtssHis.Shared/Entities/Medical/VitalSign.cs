// src/servers/TtssHis.Shared/Entities/Medical/VitalSign.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Medical;

[Comment("สัญญาณชีพ (บันทึกโดยพยาบาล)")]
public sealed class VitalSign
{
    public required string Id { get; set; }

    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("อุณหภูมิ องศาเซลเซียส")]
    public decimal? Temperature { get; set; }

    [Comment("ชีพจร ครั้ง/นาที")]
    public int? PulseRate { get; set; }

    [Comment("อัตราการหายใจ ครั้ง/นาที")]
    public int? RespiratoryRate { get; set; }

    [Comment("ความดันโลหิต Systolic")]
    public int? BloodPressureSystolic { get; set; }

    [Comment("ความดันโลหิต Diastolic")]
    public int? BloodPressureDiastolic { get; set; }

    [Comment("ความอิ่มตัวออกซิเจน %")]
    public int? OxygenSaturation { get; set; }

    [Comment("น้ำหนัก กก.")]
    public decimal? Weight { get; set; }

    [Comment("ส่วนสูง ซม.")]
    public decimal? Height { get; set; }

    public string? RecordedBy { get; set; }
    public DateTime RecordedDate { get; set; }
}
