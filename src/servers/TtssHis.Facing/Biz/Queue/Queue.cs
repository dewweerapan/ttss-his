// src/servers/TtssHis.Facing/Biz/Queue/Queue.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TtssHis.Facing.Hubs;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing.Biz.Queue;

[ApiController]
[Route("api/queue")]
[Authorize]
public sealed class Queue(HisDbContext db, IHubContext<QueueHub> hub) : ControllerBase
{
    // ── PUBLIC DISPLAY (no auth) ───────────────────────────────────────────
    /// <summary>Public queue summary for display boards — no PII</summary>
    [HttpGet("display")]
    [AllowAnonymous]
    public ActionResult<QueueDisplayResponse> Display(
        [FromQuery] string divisionId = "div-opd",
        [FromQuery] string? date = null)
    {
        var targetDate = date is not null
            ? DateOnly.Parse(date)
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var items = db.QueueItems
            .Where(q => q.DivisionId == divisionId
                && DateOnly.FromDateTime(q.CreatedDate) == targetDate)
            .OrderBy(q => q.QueueNo)
            .Select(q => new QueueDisplayItem(q.Id, q.QueueNo, q.Status))
            .ToList();

        var summary = new QueueSummary(
            items.Count(i => i.Status == 1),
            items.Count(i => i.Status == 2),
            items.Count(i => i.Status == 3),
            items.Count(i => i.Status == 4)
        );

        return Ok(new QueueDisplayResponse(items, summary));
    }

    // ── LIST ──────────────────────────────────────────────────────────────
    /// <summary>Get today's queue for a division</summary>
    [HttpGet]
    public ActionResult<QueueListResponse> List(
        [FromQuery] string divisionId = "div-opd",
        [FromQuery] string? date = null)
    {
        var targetDate = date is not null
            ? DateOnly.Parse(date)
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var items = db.QueueItems
            .Where(q => q.DivisionId == divisionId
                && DateOnly.FromDateTime(q.CreatedDate) == targetDate)
            .OrderBy(q => q.QueueNo)
            .Select(q => new QueueItemDto(
                q.Id,
                q.QueueNo,
                q.Status,
                q.EncounterId,
                q.Encounter!.EncounterNo,
                q.Encounter.Patient!.Hn,
                (q.Encounter.Patient.PreName ?? "") + q.Encounter.Patient.FirstName + " " + q.Encounter.Patient.LastName,
                q.Encounter.ChiefComplaint,
                q.CreatedDate,
                q.CalledAt,
                q.ServedAt,
                q.DoneAt
            ))
            .ToList();

        var summary = new QueueSummary(
            items.Count(i => i.Status == 1),
            items.Count(i => i.Status == 2),
            items.Count(i => i.Status == 3),
            items.Count(i => i.Status == 4)
        );

        return Ok(new QueueListResponse(items, summary));
    }

    // ── CALL (WAITING → CALLED) ────────────────────────────────────────────
    [HttpPost("{id}/call")]
    public async Task<ActionResult<QueueItemDto>> Call(string id)
    {
        var item = await db.QueueItems
            .Include(q => q.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (item is null) return NotFound();
        if (item.Status != 1) return BadRequest($"Queue item status is {item.Status}, expected WAITING(1).");

        item.Status   = 2; // CALLED
        item.CalledAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await hub.Clients.Group(item.DivisionId).SendAsync("QueueUpdated", item.DivisionId);

        return Ok(ToDto(item));
    }

    // ── SERVE (CALLED → SERVING) ───────────────────────────────────────────
    [HttpPost("{id}/serve")]
    public async Task<ActionResult<QueueItemDto>> Serve(string id)
    {
        var item = await db.QueueItems
            .Include(q => q.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (item is null) return NotFound();
        if (item.Status != 2) return BadRequest($"Queue item status is {item.Status}, expected CALLED(2).");

        item.Status   = 3; // SERVING
        item.ServedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await hub.Clients.Group(item.DivisionId).SendAsync("QueueUpdated", item.DivisionId);

        return Ok(ToDto(item));
    }

    // ── DONE (SERVING → DONE) ──────────────────────────────────────────────
    [HttpPost("{id}/done")]
    public async Task<ActionResult<QueueItemDto>> Done(string id)
    {
        var item = await db.QueueItems
            .Include(q => q.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (item is null) return NotFound();
        if (item.Status != 3) return BadRequest($"Queue item status is {item.Status}, expected SERVING(3).");

        item.Status = 4; // DONE
        item.DoneAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await hub.Clients.Group(item.DivisionId).SendAsync("QueueUpdated", item.DivisionId);

        return Ok(ToDto(item));
    }

    // ── SKIP ──────────────────────────────────────────────────────────────
    [HttpPost("{id}/skip")]
    public async Task<ActionResult<QueueItemDto>> Skip(string id)
    {
        var item = await db.QueueItems
            .Include(q => q.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(q => q.Id == id);

        if (item is null) return NotFound();
        if (item.Status == 4 || item.Status == 5) return BadRequest("Queue item is already finished.");

        item.Status = 5; // SKIPPED
        await db.SaveChangesAsync();
        await hub.Clients.Group(item.DivisionId).SendAsync("QueueUpdated", item.DivisionId);

        return Ok(ToDto(item));
    }

    // ── HELPER ────────────────────────────────────────────────────────────
    private static QueueItemDto ToDto(TtssHis.Shared.Entities.Queue.QueueItem q) =>
        new(q.Id, q.QueueNo, q.Status, q.EncounterId,
            q.Encounter?.EncounterNo ?? "",
            q.Encounter?.Patient?.Hn ?? "",
            (q.Encounter?.Patient?.PreName ?? "") + (q.Encounter?.Patient?.FirstName ?? "") + " " + (q.Encounter?.Patient?.LastName ?? ""),
            q.Encounter?.ChiefComplaint,
            q.CreatedDate, q.CalledAt, q.ServedAt, q.DoneAt);
}

// ── RECORDS ───────────────────────────────────────────────────────────────
public record QueueItemDto(
    string Id, string QueueNo, int Status,
    string EncounterId, string EncounterNo, string Hn, string PatientName,
    string? ChiefComplaint,
    DateTime CreatedDate, DateTime? CalledAt, DateTime? ServedAt, DateTime? DoneAt);

public record QueueSummary(int Waiting, int Called, int Serving, int Done);
public record QueueListResponse(IEnumerable<QueueItemDto> Items, QueueSummary Summary);
public record QueueDisplayItem(string Id, string QueueNo, int Status);
public record QueueDisplayResponse(IEnumerable<QueueDisplayItem> Items, QueueSummary Summary);
