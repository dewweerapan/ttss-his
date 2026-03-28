// src/servers/TtssHis.Shared/Entities/BloodBank/BloodRequest.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.BloodBank;

[Comment("คำขอโลหิต")]
public sealed class BloodRequest
{
    public required string Id           { get; set; }
    public required string EncounterId  { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("WHOLE=1, PACKED_RBC=2, FFP=3, PLATELET=4, CRYOPRECIPITATE=5")]
    public int BloodProduct              { get; set; } = 2;
    public required string BloodGroup   { get; set; }  // A+, B-, O+, AB+, etc.
    public decimal Units                { get; set; }  // number of units
    public string? CrossmatchResult     { get; set; }
    public string? RequestedBy          { get; set; }

    [Comment("PENDING=1, CROSSMATCH=2, READY=3, TRANSFUSED=4, CANCELLED=9")]
    public int Status                   { get; set; } = 1;
    public DateTime RequestDate         { get; set; }
    public DateTime? TransfusedAt       { get; set; }
    public string? TransfusionNotes     { get; set; }
    public string? ReactionNotes        { get; set; }
}
