// src/servers/TtssHis.Shared/Entities/Imaging/ImagingOrder.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Imaging;

[Comment("คำสั่งถ่ายภาพรังสี")]
public sealed class ImagingOrder
{
    public required string Id           { get; set; }
    public required string EncounterId  { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("XRAY=1, CT=2, MRI=3, ULTRASOUND=4, NUCLEAR=5, OTHER=9")]
    public int ModalityType             { get; set; } = 1;
    public required string StudyName    { get; set; }
    public string? ClinicalInfo         { get; set; }
    public string? OrderedBy            { get; set; }

    [Comment("ORDERED=1, SCHEDULED=2, IN_PROGRESS=3, COMPLETED=4, CANCELLED=9")]
    public int Status                   { get; set; } = 1;
    public DateTime OrderDate           { get; set; }
    public DateTime? CompletedAt        { get; set; }
    public string? RadiologyReport      { get; set; }
    public string? RadiologistName      { get; set; }
    public string? Impression           { get; set; }
}
