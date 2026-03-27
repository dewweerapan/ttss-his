// src/servers/TtssHis.Facing/Biz/Dashboard/Dashboard.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing.Biz.Dashboard;

[ApiController]
[Authorize]
public sealed class DashboardController(HisDbContext db) : ControllerBase
{
    // ── SUMMARY STATS ─────────────────────────────────────────────────────
    /// <summary>GET /api/dashboard/stats — today's KPIs</summary>
    [HttpGet("api/dashboard/stats")]
    public ActionResult<DashboardStats> GetStats([FromQuery] string? date = null)
    {
        var targetDate = date is not null
            ? DateOnly.Parse(date)
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var allEncounters = db.Encounters
            .Where(e => e.IsActive && e.DeletedDate == null
                && DateOnly.FromDateTime(e.AdmissionDate) == targetDate)
            .ToList();

        var opdToday   = allEncounters.Count(e => e.Type == 1);
        var ipdAdmit   = allEncounters.Count(e => e.Type == 2 && e.Status == 2);
        var erToday    = allEncounters.Count(e => e.Type == 3);
        var ipdDischarge = allEncounters.Count(e => e.Type == 2 && e.Status == 3
            && e.DischargeDate.HasValue
            && DateOnly.FromDateTime(e.DischargeDate.Value) == targetDate);

        // Bed occupancy
        var totalBeds    = db.Beds.Count(b => b.IsActive);
        var occupiedBeds = db.Beds.Count(b => b.IsActive && b.Status == 2);

        // Queue stats (today)
        var queueTotal  = db.QueueItems
            .Where(q => DateOnly.FromDateTime(q.CreatedDate) == targetDate)
            .Count();
        var queueDone   = db.QueueItems
            .Where(q => DateOnly.FromDateTime(q.CreatedDate) == targetDate && q.Status == 4)
            .Count();

        // Revenue today
        var revenueToday = db.Receipts
            .Where(r => DateOnly.FromDateTime(r.PaidAt) == targetDate)
            .Sum(r => (decimal?)r.Amount) ?? 0m;

        // Lab orders today
        var labToday     = db.LabOrders
            .Count(o => DateOnly.FromDateTime(o.RequestDate) == targetDate);
        var labCompleted = db.LabOrders
            .Count(o => DateOnly.FromDateTime(o.RequestDate) == targetDate && o.Status == 4);

        // Pending drug orders
        var drugPending  = db.DrugOrders.Count(o => o.Status == 1);

        // Invoice pending
        var invoicePending = db.Invoices.Count(i => i.Status == 1);

        return Ok(new DashboardStats(
            targetDate.ToString("yyyy-MM-dd"),
            opdToday, ipdAdmit, ipdDischarge, erToday,
            totalBeds, occupiedBeds,
            queueTotal, queueDone,
            revenueToday,
            labToday, labCompleted,
            drugPending, invoicePending
        ));
    }

    // ── DAILY OPD REPORT ──────────────────────────────────────────────────
    /// <summary>GET /api/dashboard/opd-report — OPD encounters for a date</summary>
    [HttpGet("api/dashboard/opd-report")]
    public ActionResult<IEnumerable<OpdReportItem>> GetOpdReport([FromQuery] string? date = null)
    {
        var targetDate = date is not null
            ? DateOnly.Parse(date)
            : DateOnly.FromDateTime(DateTime.UtcNow);

        var items = db.Encounters
            .Include(e => e.Patient)
            .Include(e => e.Doctor)
            .Include(e => e.Invoice)
            .Where(e => e.Type == 1 && e.IsActive && e.DeletedDate == null
                && DateOnly.FromDateTime(e.AdmissionDate) == targetDate)
            .OrderBy(e => e.AdmissionDate)
            .Select(e => new OpdReportItem(
                e.EncounterNo,
                e.Patient!.Hn,
                (e.Patient.PreName ?? "") + e.Patient.FirstName + " " + e.Patient.LastName,
                e.Doctor != null ? e.Doctor.FirstName + " " + e.Doctor.LastName : "-",
                e.Status,
                e.AdmissionDate,
                e.DischargeDate,
                e.Invoice != null ? e.Invoice.TotalAmount : (decimal?)null,
                e.Invoice != null ? e.Invoice.Status : (int?)null
            ))
            .ToList();

        return Ok(items);
    }

    // ── IPD CENSUS ────────────────────────────────────────────────────────
    /// <summary>GET /api/dashboard/ipd-census — current IPD patients by ward</summary>
    [HttpGet("api/dashboard/ipd-census")]
    public ActionResult<IEnumerable<IpdCensusItem>> GetIpdCensus()
    {
        var wards = db.Wards.Where(w => w.IsActive).OrderBy(w => w.Code).ToList();
        var beds  = db.Beds.Where(b => b.IsActive).ToList();

        var result = wards.Select(w =>
        {
            var wardBeds     = beds.Where(b => b.WardId == w.Id).ToList();
            var totalBeds    = wardBeds.Count;
            var occupiedBeds = wardBeds.Count(b => b.Status == 2);
            var availBeds    = wardBeds.Count(b => b.Status == 1);
            return new IpdCensusItem(w.Id, w.Code, w.Name, w.Type, totalBeds, occupiedBeds, availBeds);
        }).ToList();

        return Ok(result);
    }

    // ── REVENUE REPORT ────────────────────────────────────────────────────
    /// <summary>GET /api/dashboard/revenue — revenue by date range</summary>
    [HttpGet("api/dashboard/revenue")]
    public ActionResult<IEnumerable<RevenueDayItem>> GetRevenue(
        [FromQuery] string? from = null,
        [FromQuery] string? to = null)
    {
        var fromDate = from is not null ? DateOnly.Parse(from) : DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-6));
        var toDate   = to is not null ? DateOnly.Parse(to) : DateOnly.FromDateTime(DateTime.UtcNow);

        var receipts = db.Receipts
            .Where(r => DateOnly.FromDateTime(r.PaidAt) >= fromDate
                     && DateOnly.FromDateTime(r.PaidAt) <= toDate)
            .ToList();

        var result = receipts
            .GroupBy(r => DateOnly.FromDateTime(r.PaidAt))
            .OrderBy(g => g.Key)
            .Select(g => new RevenueDayItem(g.Key.ToString("yyyy-MM-dd"), g.Sum(r => r.Amount), g.Count()))
            .ToList();

        return Ok(result);
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────
public record DashboardStats(
    string Date,
    int OpdToday,
    int IpdAdmitted,
    int IpdDischarged,
    int ErToday,
    int TotalBeds,
    int OccupiedBeds,
    int QueueTotal,
    int QueueDone,
    decimal RevenueToday,
    int LabOrdersToday,
    int LabCompleted,
    int DrugOrdersPending,
    int InvoicesPending
);

public record OpdReportItem(
    string EncounterNo,
    string Hn,
    string PatientName,
    string DoctorName,
    int Status,
    DateTime AdmissionDate,
    DateTime? DischargeDate,
    decimal? InvoiceAmount,
    int? InvoiceStatus
);

public record IpdCensusItem(
    string WardId,
    string WardCode,
    string WardName,
    int WardType,
    int TotalBeds,
    int OccupiedBeds,
    int AvailableBeds
);

public record RevenueDayItem(string Date, decimal Amount, int Count);
