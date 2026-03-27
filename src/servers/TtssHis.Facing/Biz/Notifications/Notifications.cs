// src/servers/TtssHis.Facing/Biz/Notifications/Notifications.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing.Biz.Notifications;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class Notifications(HisDbContext db) : ControllerBase
{
    /// <summary>Pending counts per role — used for nav badge indicators</summary>
    [HttpGet("counts")]
    public ActionResult<NotificationCounts> GetCounts()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        return Ok(new NotificationCounts(
            PendingDrugOrders:  db.DrugOrders.Count(o => o.Status == 1),
            PendingLabOrders:   db.LabOrders.Count(o => o.Status == 1),
            PendingInvoices:    db.Invoices.Count(i => i.Status == 1),
            WaitingQueue:       db.QueueItems.Count(q => q.Status == 1 && DateOnly.FromDateTime(q.CreatedDate) == today)
        ));
    }
}

public record NotificationCounts(
    int PendingDrugOrders,
    int PendingLabOrders,
    int PendingInvoices,
    int WaitingQueue
);
