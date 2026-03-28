// src/servers/TtssHis.Facing/Biz/Claims/Claims.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Claims;

namespace TtssHis.Facing.Biz.Claims;

[ApiController]
[Authorize]
public sealed class Claims(HisDbContext db) : ControllerBase
{
    /// <summary>GET /api/insurance-claims</summary>
    [HttpGet("api/insurance-claims")]
    public async Task<ActionResult<IEnumerable<InsuranceClaimDto>>> List(
        [FromQuery] int? status = null,
        [FromQuery] string? encounterId = null)
    {
        var q = db.InsuranceClaims
            .Include(c => c.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();

        if (status.HasValue)    q = q.Where(c => c.Status == status.Value);
        if (encounterId != null) q = q.Where(c => c.EncounterId == encounterId);

        var items = await q.OrderByDescending(c => c.ClaimDate)
            .Select(c => ToDto(c))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>POST /api/insurance-claims</summary>
    [HttpPost("api/insurance-claims")]
    public async Task<ActionResult<InsuranceClaimDto>> Create([FromBody] CreateClaimReq req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == req.EncounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var claimNo = $"CLM{DateTime.UtcNow:yyyyMMddHHmmss}{Guid.NewGuid().ToString()[..4].ToUpper()}";
        var claim = new InsuranceClaim
        {
            Id          = Guid.NewGuid().ToString(),
            EncounterId = req.EncounterId,
            CoverageId  = req.CoverageId,
            ClaimNo     = claimNo,
            ClaimAmount = req.ClaimAmount,
            Status      = 1,
            ClaimDate   = DateTime.UtcNow,
            Notes       = req.Notes,
        };
        db.InsuranceClaims.Add(claim);
        await db.SaveChangesAsync();
        return Ok(ToDto(claim));
    }

    /// <summary>PATCH /api/insurance-claims/{id}/submit</summary>
    [HttpPatch("api/insurance-claims/{id}/submit")]
    public async Task<IActionResult> Submit(string id)
    {
        var c = await db.InsuranceClaims.FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound();
        if (c.Status != 1) return BadRequest("Claim is not in DRAFT.");
        c.Status      = 2;
        c.SubmittedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/insurance-claims/{id}/approve</summary>
    [HttpPatch("api/insurance-claims/{id}/approve")]
    public async Task<IActionResult> Approve(string id, [FromBody] ApproveClaimReq req)
    {
        var c = await db.InsuranceClaims.FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound();
        c.Status         = 3;
        c.ApprovedAmount = req.ApprovedAmount;
        c.ProcessedAt    = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/insurance-claims/{id}/reject</summary>
    [HttpPatch("api/insurance-claims/{id}/reject")]
    public async Task<IActionResult> Reject(string id, [FromBody] RejectClaimReq req)
    {
        var c = await db.InsuranceClaims.FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound();
        c.Status          = 4;
        c.RejectionReason = req.Reason;
        c.ProcessedAt     = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static InsuranceClaimDto ToDto(InsuranceClaim c) => new(
        c.Id, c.EncounterId,
        c.Encounter?.Patient != null
            ? (c.Encounter.Patient.PreName ?? "") + c.Encounter.Patient.FirstName + " " + c.Encounter.Patient.LastName
            : null,
        c.Encounter?.Patient?.Hn,
        c.CoverageId, c.ClaimNo, c.ClaimAmount, c.ApprovedAmount,
        c.Status, c.RejectionReason, c.ClaimDate, c.SubmittedAt, c.ProcessedAt, c.Notes
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record CreateClaimReq(string EncounterId, string? CoverageId, decimal ClaimAmount, string? Notes);
public record ApproveClaimReq(decimal ApprovedAmount);
public record RejectClaimReq(string? Reason);
public record InsuranceClaimDto(
    string Id, string EncounterId, string? PatientName, string? Hn,
    string? CoverageId, string? ClaimNo, decimal ClaimAmount, decimal? ApprovedAmount,
    int Status, string? RejectionReason,
    DateTime ClaimDate, DateTime? SubmittedAt, DateTime? ProcessedAt, string? Notes
);
