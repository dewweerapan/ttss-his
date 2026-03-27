// src/servers/TtssHis.Facing/Biz/Wards/Wards.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing.Biz.Wards;

[ApiController]
[Authorize]
public sealed class Wards(HisDbContext db) : ControllerBase
{
    // ── LIST WARDS ────────────────────────────────────────────────────────
    /// <summary>GET /api/wards — list all active wards</summary>
    [HttpGet("api/wards")]
    public ActionResult<IEnumerable<WardDto>> List()
    {
        var wards = db.Wards
            .Where(w => w.IsActive)
            .OrderBy(w => w.Code)
            .Select(w => new WardDto(w.Id, w.Code, w.Name, w.Type, w.TotalBeds))
            .ToList();

        return Ok(wards);
    }

    // ── LIST BEDS ─────────────────────────────────────────────────────────
    /// <summary>GET /api/wards/{wardId}/beds — list beds with occupancy</summary>
    [HttpGet("api/wards/{wardId}/beds")]
    public async Task<ActionResult<IEnumerable<BedDto>>> ListBeds(string wardId)
    {
        var ward = await db.Wards.FirstOrDefaultAsync(w => w.Id == wardId && w.IsActive);
        if (ward is null) return NotFound("Ward not found.");

        var beds = await db.Beds
            .Where(b => b.WardId == wardId && b.IsActive)
            .OrderBy(b => b.BedNo)
            .ToListAsync();

        // Get patient names for occupied beds
        var occupiedEncounterIds = beds
            .Where(b => b.CurrentEncounterId != null)
            .Select(b => b.CurrentEncounterId!)
            .ToList();

        var encounterPatients = occupiedEncounterIds.Any()
            ? await db.Encounters
                .Include(e => e.Patient)
                .Where(e => occupiedEncounterIds.Contains(e.Id))
                .ToDictionaryAsync(e => e.Id, e => (e.EncounterNo, PatientName: (e.Patient!.PreName ?? "") + e.Patient.FirstName + " " + e.Patient.LastName, e.Patient.Hn))
            : new Dictionary<string, (string, string, string)>();

        var result = beds.Select(b =>
        {
            encounterPatients.TryGetValue(b.CurrentEncounterId ?? "", out var ep);
            return new BedDto(
                b.Id,
                b.BedNo,
                b.WardId,
                b.Status,
                b.CurrentEncounterId,
                ep.Item1,
                ep.Item2,
                ep.Item3
            );
        }).ToList();

        return Ok(result);
    }

    // ── GET BED ───────────────────────────────────────────────────────────
    /// <summary>GET /api/beds/{bedId}</summary>
    [HttpGet("api/beds/{bedId}")]
    public async Task<ActionResult<BedDto>> GetBed(string bedId)
    {
        var bed = await db.Beds.FirstOrDefaultAsync(b => b.Id == bedId && b.IsActive);
        if (bed is null) return NotFound();

        string? encounterNo = null, patientName = null, hn = null;
        if (bed.CurrentEncounterId is not null)
        {
            var enc = await db.Encounters.Include(e => e.Patient)
                .FirstOrDefaultAsync(e => e.Id == bed.CurrentEncounterId);
            if (enc is not null)
            {
                encounterNo = enc.EncounterNo;
                patientName = (enc.Patient!.PreName ?? "") + enc.Patient.FirstName + " " + enc.Patient.LastName;
                hn          = enc.Patient.Hn;
            }
        }

        return Ok(new BedDto(bed.Id, bed.BedNo, bed.WardId, bed.Status, bed.CurrentEncounterId, encounterNo, patientName, hn));
    }

    // ── UPDATE BED STATUS ─────────────────────────────────────────────────
    /// <summary>PATCH /api/beds/{bedId}/status — set bed to maintenance, etc.</summary>
    [HttpPatch("api/beds/{bedId}/status")]
    public async Task<IActionResult> UpdateBedStatus(string bedId, [FromBody] UpdateBedStatusRequest req)
    {
        var bed = await db.Beds.FirstOrDefaultAsync(b => b.Id == bedId && b.IsActive);
        if (bed is null) return NotFound();
        if (bed.Status == 2) return BadRequest("Cannot change status of an occupied bed.");

        bed.Status = req.Status;
        await db.SaveChangesAsync();
        return NoContent();
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record WardDto(
    string Id,
    string Code,
    string Name,
    int Type,
    int TotalBeds
);

public record BedDto(
    string Id,
    string BedNo,
    string WardId,
    int Status,
    string? CurrentEncounterId,
    string? EncounterNo,
    string? PatientName,
    string? Hn
);

public record UpdateBedStatusRequest(int Status);
