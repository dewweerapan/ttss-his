// src/servers/TtssHis.Facing/Biz/Lab/Lab.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Lab;

namespace TtssHis.Facing.Biz.Lab;

[ApiController]
[Authorize]
public sealed class LabController(HisDbContext db) : ControllerBase
{
    // ── CREATE LAB ORDER ──────────────────────────────────────────────────
    /// <summary>POST /api/encounters/{id}/lab-orders — doctor orders lab tests</summary>
    [HttpPost("api/encounters/{encounterId}/lab-orders")]
    public async Task<ActionResult<LabOrderDto>> CreateLabOrder(
        string encounterId, [FromBody] CreateLabOrderRequest req)
    {
        var enc = await db.Encounters.FirstOrDefaultAsync(e => e.Id == encounterId && e.DeletedDate == null);
        if (enc is null) return NotFound("Encounter not found.");
        if (req.Items is null || req.Items.Count == 0) return BadRequest("At least one test required.");

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var count = db.LabOrders.Count(o => o.OrderNo.StartsWith("LAB" + today));
        var orderNo = $"LAB{today}{(count + 1):D5}";

        var order = new LabOrder
        {
            Id          = Guid.NewGuid().ToString(),
            OrderNo     = orderNo,
            EncounterId = encounterId,
            OrderedBy   = req.OrderedBy,
            Status      = 1,
            RequestDate = DateTime.UtcNow,
            Notes       = req.Notes,
        };

        // Build items with LabOrderId set (required field)
        order.Items = req.Items.Select(i => new LabOrderItem
        {
            Id             = Guid.NewGuid().ToString(),
            LabOrderId     = order.Id,
            TestCode       = i.TestCode,
            TestName       = i.TestName,
            Unit           = i.Unit,
            ReferenceRange = i.ReferenceRange,
        }).ToList();

        db.LabOrders.Add(order);
        await db.SaveChangesAsync();

        return Ok(ToDto(order));
    }

    // ── LIST LAB ORDERS ───────────────────────────────────────────────────
    /// <summary>GET /api/lab-orders — lab worklist</summary>
    [HttpGet("api/lab-orders")]
    public ActionResult<IEnumerable<LabOrderDto>> List([FromQuery] int? status = null)
    {
        var query = db.LabOrders
            .Include(o => o.Items).ThenInclude(i => i.Result)
            .Include(o => o.Encounter).ThenInclude(e => e!.Patient)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(o => o.Status == status.Value);
        else
            query = query.Where(o => o.Status < 4); // not completed/cancelled

        var orders = query.OrderBy(o => o.RequestDate).ToList();
        return Ok(orders.Select(ToDto));
    }

    // ── GET LAB ORDER FOR ENCOUNTER ───────────────────────────────────────
    /// <summary>GET /api/encounters/{id}/lab-orders</summary>
    [HttpGet("api/encounters/{encounterId}/lab-orders")]
    public async Task<ActionResult<IEnumerable<LabOrderDto>>> GetForEncounter(string encounterId)
    {
        var orders = await db.LabOrders
            .Include(o => o.Items).ThenInclude(i => i.Result)
            .Include(o => o.Encounter).ThenInclude(e => e!.Patient)
            .Where(o => o.EncounterId == encounterId)
            .OrderByDescending(o => o.RequestDate)
            .ToListAsync();

        return Ok(orders.Select(ToDto));
    }

    // ── GET SINGLE LAB ORDER ──────────────────────────────────────────────
    /// <summary>GET /api/lab-orders/{id}</summary>
    [HttpGet("api/lab-orders/{id}")]
    public async Task<ActionResult<LabOrderDto>> GetById(string id)
    {
        var order = await db.LabOrders
            .Include(o => o.Items).ThenInclude(i => i.Result)
            .Include(o => o.Encounter).ThenInclude(e => e!.Patient)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        return Ok(ToDto(order));
    }

    // ── RECEIVE SPECIMEN ──────────────────────────────────────────────────
    /// <summary>PATCH /api/lab-orders/{id}/receive</summary>
    [HttpPatch("api/lab-orders/{id}/receive")]
    public async Task<IActionResult> Receive(string id)
    {
        var order = await db.LabOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (order.Status != 1) return BadRequest("Order is not PENDING.");
        order.Status = 2;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── ENTER RESULTS ─────────────────────────────────────────────────────
    /// <summary>POST /api/lab-orders/{id}/results — enter test results</summary>
    [HttpPost("api/lab-orders/{id}/results")]
    public async Task<IActionResult> EnterResults(string id, [FromBody] EnterResultsRequest req)
    {
        var order = await db.LabOrders
            .Include(o => o.Items).ThenInclude(i => i.Result)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();

        foreach (var resultReq in req.Results)
        {
            var item = order.Items.FirstOrDefault(i => i.Id == resultReq.LabOrderItemId);
            if (item is null) continue;

            if (item.Result is not null)
            {
                item.Result.Value          = resultReq.Value;
                item.Result.IsAbnormal     = resultReq.IsAbnormal;
                item.Result.ReferenceRange = resultReq.ReferenceRange ?? item.ReferenceRange;
                item.Result.EnteredBy      = resultReq.EnteredBy;
                item.Result.ResultDate     = DateTime.UtcNow;
                item.Result.Notes          = resultReq.Notes;
            }
            else
            {
                db.LabResults.Add(new LabResult
                {
                    Id              = Guid.NewGuid().ToString(),
                    LabOrderItemId  = item.Id,
                    Value           = resultReq.Value,
                    ReferenceRange  = resultReq.ReferenceRange ?? item.ReferenceRange,
                    IsAbnormal      = resultReq.IsAbnormal,
                    EnteredBy       = resultReq.EnteredBy,
                    ResultDate      = DateTime.UtcNow,
                    Notes           = resultReq.Notes,
                });
            }
        }

        // Mark completed if all items have results
        var allDone = order.Items.All(i => i.Result != null || req.Results.Any(r => r.LabOrderItemId == i.Id));
        if (allDone)
        {
            order.Status        = 4;
            order.CompletedDate = DateTime.UtcNow;
        }
        else
        {
            order.Status = 3; // PROCESSING
        }

        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── CANCEL ────────────────────────────────────────────────────────────
    /// <summary>PATCH /api/lab-orders/{id}/cancel</summary>
    [HttpPatch("api/lab-orders/{id}/cancel")]
    public async Task<IActionResult> Cancel(string id)
    {
        var order = await db.LabOrders.FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        if (order.Status == 4) return BadRequest("Cannot cancel completed order.");
        order.Status = 9;
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── HELPER ────────────────────────────────────────────────────────────
    private static LabOrderDto ToDto(LabOrder o) => new(
        o.Id, o.OrderNo, o.EncounterId,
        o.Encounter?.EncounterNo,
        o.Encounter?.Patient != null
            ? (o.Encounter.Patient.PreName ?? "") + o.Encounter.Patient.FirstName + " " + o.Encounter.Patient.LastName
            : null,
        o.Encounter?.Patient?.Hn,
        o.OrderedBy, o.Status, o.RequestDate, o.CompletedDate, o.Notes,
        o.Items.Select(i => new LabOrderItemDto(
            i.Id, i.LabOrderId, i.TestCode, i.TestName, i.Unit, i.ReferenceRange,
            i.Result is null ? null : new LabResultDto(
                i.Result.Id, i.Result.Value, i.Result.ReferenceRange,
                i.Result.IsAbnormal, i.Result.EnteredBy, i.Result.ResultDate, i.Result.Notes)
        )).ToList()
    );
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record CreateLabOrderRequest(
    string? OrderedBy,
    string? Notes,
    List<LabItemRequest> Items
);

public record LabItemRequest(
    string TestCode,
    string TestName,
    string? Unit,
    string? ReferenceRange
);

public record EnterResultsRequest(List<ResultEntry> Results);

public record ResultEntry(
    string LabOrderItemId,
    string Value,
    string? ReferenceRange,
    bool IsAbnormal,
    string? EnteredBy,
    string? Notes
);

public record LabOrderDto(
    string Id,
    string OrderNo,
    string EncounterId,
    string? EncounterNo,
    string? PatientName,
    string? Hn,
    string? OrderedBy,
    int Status,
    DateTime RequestDate,
    DateTime? CompletedDate,
    string? Notes,
    List<LabOrderItemDto> Items
);

public record LabOrderItemDto(
    string Id,
    string LabOrderId,
    string TestCode,
    string TestName,
    string? Unit,
    string? ReferenceRange,
    LabResultDto? Result
);

public record LabResultDto(
    string Id,
    string Value,
    string? ReferenceRange,
    bool IsAbnormal,
    string? EnteredBy,
    DateTime ResultDate,
    string? Notes
);
