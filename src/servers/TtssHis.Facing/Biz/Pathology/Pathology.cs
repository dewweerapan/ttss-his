// src/servers/TtssHis.Facing/Biz/Pathology/Pathology.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Pathology;

namespace TtssHis.Facing.Biz.Pathology;

[ApiController]
[Authorize]
public sealed class Pathology(HisDbContext db) : ControllerBase
{
    /// <summary>GET /api/pathology-orders</summary>
    [HttpGet("api/pathology-orders")]
    public async Task<ActionResult<IEnumerable<PathologyOrderDto>>> List(
        [FromQuery] string? encounterId = null,
        [FromQuery] int? status = null)
    {
        var q = db.PathologyOrders
            .Include(p => p.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();
        if (encounterId is not null) q = q.Where(p => p.EncounterId == encounterId);
        if (status.HasValue)         q = q.Where(p => p.Status == status.Value);

        var items = await q.OrderByDescending(p => p.OrderDate).Select(p => ToDto(p)).ToListAsync();
        return Ok(items);
    }

    /// <summary>POST /api/pathology-orders</summary>
    [HttpPost("api/pathology-orders")]
    public async Task<ActionResult<PathologyOrderDto>> Order([FromBody] CreatePathologyOrderReq req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == req.EncounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var po = new PathologyOrder
        {
            Id           = Guid.NewGuid().ToString(),
            EncounterId  = req.EncounterId,
            SpecimenType = req.SpecimenType,
            SpecimenSite = req.SpecimenSite,
            ClinicalInfo = req.ClinicalInfo,
            OrderedBy    = req.OrderedBy,
            Status       = 1,
            OrderDate    = DateTime.UtcNow,
        };
        db.PathologyOrders.Add(po);
        await db.SaveChangesAsync();
        return Ok(ToDto(po));
    }

    /// <summary>PATCH /api/pathology-orders/{id}/receive — specimen received</summary>
    [HttpPatch("api/pathology-orders/{id}/receive")]
    public async Task<IActionResult> Receive(string id)
    {
        var po = await db.PathologyOrders.FirstOrDefaultAsync(p => p.Id == id);
        if (po is null) return NotFound();
        po.Status     = 2;
        po.ReceivedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/pathology-orders/{id}/report — enter pathology report</summary>
    [HttpPatch("api/pathology-orders/{id}/report")]
    public async Task<IActionResult> Report(string id, [FromBody] PathologyReportReq req)
    {
        var po = await db.PathologyOrders.FirstOrDefaultAsync(p => p.Id == id);
        if (po is null) return NotFound();
        po.Status               = 4;
        po.ReportedAt           = DateTime.UtcNow;
        po.MacroscopicFindings  = req.MacroscopicFindings;
        po.MicroscopicFindings  = req.MicroscopicFindings;
        po.Diagnosis            = req.Diagnosis;
        po.PathologistName      = req.PathologistName;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/pathology-orders/{id}/cancel</summary>
    [HttpPatch("api/pathology-orders/{id}/cancel")]
    public async Task<IActionResult> Cancel(string id)
    {
        var po = await db.PathologyOrders.FirstOrDefaultAsync(p => p.Id == id);
        if (po is null) return NotFound();
        if (po.Status == 4) return BadRequest("Cannot cancel a completed order.");
        po.Status = 9;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static PathologyOrderDto ToDto(PathologyOrder p) => new(
        p.Id, p.EncounterId,
        p.Encounter?.Patient != null
            ? (p.Encounter.Patient.PreName ?? "") + p.Encounter.Patient.FirstName + " " + p.Encounter.Patient.LastName
            : null,
        p.Encounter?.Patient?.Hn,
        p.SpecimenType, p.SpecimenSite, p.ClinicalInfo, p.OrderedBy,
        p.Status, p.OrderDate, p.ReceivedAt, p.ReportedAt,
        p.MacroscopicFindings, p.MicroscopicFindings, p.Diagnosis, p.PathologistName
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record CreatePathologyOrderReq(
    string EncounterId, int SpecimenType, string SpecimenSite,
    string? ClinicalInfo, string? OrderedBy
);
public record PathologyReportReq(
    string? MacroscopicFindings, string? MicroscopicFindings,
    string? Diagnosis, string? PathologistName
);
public record PathologyOrderDto(
    string Id, string EncounterId, string? PatientName, string? Hn,
    int SpecimenType, string SpecimenSite, string? ClinicalInfo, string? OrderedBy,
    int Status, DateTime OrderDate, DateTime? ReceivedAt, DateTime? ReportedAt,
    string? MacroscopicFindings, string? MicroscopicFindings,
    string? Diagnosis, string? PathologistName
);
