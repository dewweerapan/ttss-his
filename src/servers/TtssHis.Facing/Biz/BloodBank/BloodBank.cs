// src/servers/TtssHis.Facing/Biz/BloodBank/BloodBank.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.BloodBank;

namespace TtssHis.Facing.Biz.BloodBank;

[ApiController]
[Authorize]
public sealed class BloodBank(HisDbContext db) : ControllerBase
{
    /// <summary>GET /api/blood-requests</summary>
    [HttpGet("api/blood-requests")]
    public async Task<ActionResult<IEnumerable<BloodRequestDto>>> List(
        [FromQuery] int? status = null,
        [FromQuery] string? encounterId = null)
    {
        var q = db.BloodRequests
            .Include(b => b.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();

        if (status.HasValue)    q = q.Where(b => b.Status == status.Value);
        if (encounterId is not null) q = q.Where(b => b.EncounterId == encounterId);

        var items = await q.OrderByDescending(b => b.RequestDate)
            .Select(b => ToDto(b))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>POST /api/blood-requests</summary>
    [HttpPost("api/blood-requests")]
    public async Task<ActionResult<BloodRequestDto>> Request([FromBody] CreateBloodRequestReq req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == req.EncounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var br = new BloodRequest
        {
            Id           = Guid.NewGuid().ToString(),
            EncounterId  = req.EncounterId,
            BloodProduct = req.BloodProduct,
            BloodGroup   = req.BloodGroup,
            Units        = req.Units,
            RequestedBy  = req.RequestedBy,
            Status       = 1,
            RequestDate  = DateTime.UtcNow,
        };
        db.BloodRequests.Add(br);
        await db.SaveChangesAsync();
        return Ok(ToDto(br));
    }

    /// <summary>PATCH /api/blood-requests/{id}/crossmatch</summary>
    [HttpPatch("api/blood-requests/{id}/crossmatch")]
    public async Task<IActionResult> Crossmatch(string id, [FromBody] CrossmatchReq req)
    {
        var br = await db.BloodRequests.FirstOrDefaultAsync(b => b.Id == id);
        if (br is null) return NotFound();
        br.Status           = 2;
        br.CrossmatchResult = req.Result;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/blood-requests/{id}/ready</summary>
    [HttpPatch("api/blood-requests/{id}/ready")]
    public async Task<IActionResult> MarkReady(string id)
    {
        var br = await db.BloodRequests.FirstOrDefaultAsync(b => b.Id == id);
        if (br is null) return NotFound();
        br.Status = 3;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/blood-requests/{id}/transfuse</summary>
    [HttpPatch("api/blood-requests/{id}/transfuse")]
    public async Task<IActionResult> Transfuse(string id, [FromBody] TransfuseReq req)
    {
        var br = await db.BloodRequests.FirstOrDefaultAsync(b => b.Id == id);
        if (br is null) return NotFound();
        if (br.Status != 3) return BadRequest("Blood is not READY.");
        br.Status            = 4;
        br.TransfusedAt      = DateTime.UtcNow;
        br.TransfusionNotes  = req.Notes;
        br.ReactionNotes     = req.ReactionNotes;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/blood-requests/{id}/cancel</summary>
    [HttpPatch("api/blood-requests/{id}/cancel")]
    public async Task<IActionResult> Cancel(string id)
    {
        var br = await db.BloodRequests.FirstOrDefaultAsync(b => b.Id == id);
        if (br is null) return NotFound();
        if (br.Status == 4) return BadRequest("Cannot cancel a transfused request.");
        br.Status = 9;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static BloodRequestDto ToDto(BloodRequest b) => new(
        b.Id, b.EncounterId,
        b.Encounter?.Patient != null
            ? (b.Encounter.Patient.PreName ?? "") + b.Encounter.Patient.FirstName + " " + b.Encounter.Patient.LastName
            : null,
        b.Encounter?.Patient?.Hn,
        b.BloodProduct, b.BloodGroup, b.Units, b.CrossmatchResult,
        b.RequestedBy, b.Status, b.RequestDate, b.TransfusedAt, b.TransfusionNotes, b.ReactionNotes
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record CreateBloodRequestReq(
    string EncounterId,
    int BloodProduct,
    string BloodGroup,
    decimal Units,
    string? RequestedBy
);
public record CrossmatchReq(string? Result);
public record TransfuseReq(string? Notes, string? ReactionNotes);
public record BloodRequestDto(
    string Id, string EncounterId, string? PatientName, string? Hn,
    int BloodProduct, string BloodGroup, decimal Units,
    string? CrossmatchResult, string? RequestedBy,
    int Status, DateTime RequestDate, DateTime? TransfusedAt,
    string? TransfusionNotes, string? ReactionNotes
);
