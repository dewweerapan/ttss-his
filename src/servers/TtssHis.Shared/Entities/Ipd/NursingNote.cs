// src/servers/TtssHis.Shared/Entities/Ipd/NursingNote.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Ipd;

[Comment("บันทึกการพยาบาล")]
public sealed class NursingNote
{
    public required string Id { get; set; }
    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    [Comment("ASSESSMENT=1, INTERVENTION=2, EVALUATION=3, PROGRESS=4")]
    public int NoteType { get; set; } = 4;

    public required string Content { get; set; }
    public string? RecordedBy { get; set; }
    public DateTime RecordedDate { get; set; }
}
