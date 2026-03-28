// src/servers/TtssHis.Facing/Biz/Imaging/Imaging.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Imaging;

namespace TtssHis.Facing.Biz.Imaging;

[ApiController]
[Authorize]
public sealed class Imaging(HisDbContext db) : ControllerBase
{
    /// <summary>GET /api/imaging-orders</summary>
    [HttpGet("api/imaging-orders")]
    public async Task<ActionResult<IEnumerable<ImagingOrderDto>>> List(
        [FromQuery] string? encounterId = null,
        [FromQuery] int? status = null)
    {
        var q = db.ImagingOrders
            .Include(i => i.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();

        if (encounterId is not null) q = q.Where(i => i.EncounterId == encounterId);
        if (status.HasValue)         q = q.Where(i => i.Status == status.Value);

        var items = await q.OrderByDescending(i => i.OrderDate)
            .Select(i => ToDto(i))
            .ToListAsync();
        return Ok(items);
    }

    /// <summary>POST /api/imaging-orders</summary>
    [HttpPost("api/imaging-orders")]
    public async Task<ActionResult<ImagingOrderDto>> Order([FromBody] CreateImagingOrderReq req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == req.EncounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");

        var io = new ImagingOrder
        {
            Id           = Guid.NewGuid().ToString(),
            EncounterId  = req.EncounterId,
            ModalityType = req.ModalityType,
            StudyName    = req.StudyName,
            ClinicalInfo = req.ClinicalInfo,
            OrderedBy    = req.OrderedBy,
            Status       = 1,
            OrderDate    = DateTime.UtcNow,
        };
        db.ImagingOrders.Add(io);
        await db.SaveChangesAsync();
        return Ok(ToDto(io));
    }

    /// <summary>PATCH /api/imaging-orders/{id}/complete — add radiology report</summary>
    [HttpPatch("api/imaging-orders/{id}/complete")]
    public async Task<IActionResult> Complete(string id, [FromBody] CompleteImagingReq req)
    {
        var io = await db.ImagingOrders.FirstOrDefaultAsync(i => i.Id == id);
        if (io is null) return NotFound();
        io.Status           = 4;
        io.CompletedAt      = DateTime.UtcNow;
        io.RadiologyReport  = req.Report;
        io.RadiologistName  = req.RadiologistName;
        io.Impression       = req.Impression;
        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>PATCH /api/imaging-orders/{id}/cancel</summary>
    [HttpPatch("api/imaging-orders/{id}/cancel")]
    public async Task<IActionResult> Cancel(string id)
    {
        var io = await db.ImagingOrders.FirstOrDefaultAsync(i => i.Id == id);
        if (io is null) return NotFound();
        if (io.Status == 4) return BadRequest("Cannot cancel a completed order.");
        io.Status = 9;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ImagingOrderDto ToDto(ImagingOrder i) => new(
        i.Id, i.EncounterId,
        i.Encounter?.Patient != null
            ? (i.Encounter.Patient.PreName ?? "") + i.Encounter.Patient.FirstName + " " + i.Encounter.Patient.LastName
            : null,
        i.Encounter?.Patient?.Hn,
        i.ModalityType, i.StudyName, i.ClinicalInfo, i.OrderedBy,
        i.Status, i.OrderDate, i.CompletedAt,
        i.RadiologyReport, i.RadiologistName, i.Impression
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record CreateImagingOrderReq(
    string EncounterId, int ModalityType,
    string StudyName, string? ClinicalInfo, string? OrderedBy
);
public record CompleteImagingReq(string? Report, string? RadiologistName, string? Impression);
public record ImagingOrderDto(
    string Id, string EncounterId, string? PatientName, string? Hn,
    int ModalityType, string StudyName, string? ClinicalInfo, string? OrderedBy,
    int Status, DateTime OrderDate, DateTime? CompletedAt,
    string? RadiologyReport, string? RadiologistName, string? Impression
);
