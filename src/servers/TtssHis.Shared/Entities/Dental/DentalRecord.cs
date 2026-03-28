// src/servers/TtssHis.Shared/Entities/Dental/DentalRecord.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Dental;

[Comment("บันทึกทันตกรรม")]
public sealed class DentalRecord
{
    public required string Id           { get; set; }
    public required string EncounterId  { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("CHECKUP=1, FILLING=2, EXTRACTION=3, RCT=4, SCALING=5, DENTURE=6, ORTHODONTICS=7, SURGERY=8, OTHER=9")]
    public int ProcedureType            { get; set; } = 1;
    public string? ToothNumbers         { get; set; }  // e.g., "16,17,26"
    public string? ChiefComplaint       { get; set; }
    public string? Findings             { get; set; }
    public string? Treatment            { get; set; }
    public string? Materials            { get; set; }
    public string? DentistName          { get; set; }
    public string? NextAppointment      { get; set; }
    public DateTime VisitDate           { get; set; }
}
