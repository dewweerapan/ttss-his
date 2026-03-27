// src/servers/TtssHis.Shared/Entities/Queue/QueueItem.cs
using Microsoft.EntityFrameworkCore;

namespace TtssHis.Shared.Entities.Queue;

[Comment("คิวผู้ป่วย OPD")]
public sealed class QueueItem
{
    public required string Id { get; set; }

    [Comment("หมายเลขคิว เช่น A001")]
    public required string QueueNo { get; set; }

    public required string EncounterId { get; set; }
    public Encounter.Encounter? Encounter { get; set; }

    public required string DivisionId { get; set; }

    [Comment("WAITING=1, CALLED=2, SERVING=3, DONE=4, SKIPPED=5")]
    public int Status { get; set; } = 1;

    public DateTime CreatedDate { get; set; }
    public DateTime? CalledAt { get; set; }
    public DateTime? ServedAt { get; set; }
    public DateTime? DoneAt { get; set; }
}
