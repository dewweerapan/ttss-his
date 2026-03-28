// src/servers/TtssHis.Shared/Entities/Pathology/PathologyOrder.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Pathology;

[Comment("คำสั่งส่งตรวจชิ้นเนื้อ/พยาธิวิทยา")]
public sealed class PathologyOrder
{
    public required string Id           { get; set; }
    public required string EncounterId  { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("BIOPSY=1, HISTOLOGY=2, CYTOLOGY=3, FROZEN_SECTION=4, AUTOPSY=5, OTHER=9")]
    public int SpecimenType             { get; set; } = 1;
    public required string SpecimenSite { get; set; }
    public string? ClinicalInfo         { get; set; }
    public string? OrderedBy            { get; set; }

    [Comment("ORDERED=1, RECEIVED=2, PROCESSING=3, REPORTED=4, CANCELLED=9")]
    public int Status                   { get; set; } = 1;
    public DateTime OrderDate           { get; set; }
    public DateTime? ReceivedAt         { get; set; }
    public DateTime? ReportedAt         { get; set; }
    public string? MacroscopicFindings  { get; set; }
    public string? MicroscopicFindings  { get; set; }
    public string? Diagnosis            { get; set; }
    public string? PathologistName      { get; set; }
}
