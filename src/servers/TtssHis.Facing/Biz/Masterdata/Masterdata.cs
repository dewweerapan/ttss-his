// src/servers/TtssHis.Facing/Biz/Masterdata/Masterdata.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing.Biz.Masterdata;

[ApiController]
[Route("api/masterdata")]
[Authorize]
public sealed class Masterdata(HisDbContext db) : ControllerBase
{
    // ── ICD-10 SEARCH ─────────────────────────────────────────────────────
    /// <summary>Search ICD-10 codes by code prefix or name fragment</summary>
    [HttpGet("icd10")]
    public ActionResult<IEnumerable<Icd10Item>> SearchIcd10(
        [FromQuery] string? search,
        [FromQuery] int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(search))
            return Ok(Array.Empty<Icd10Item>());

        var term = search.Trim().ToLower();
        var results = db.Icd10s
            .Where(i =>
                i.Code.ToLower().StartsWith(term) ||
                i.Name.ToLower().Contains(term) ||
                (i.NameEn != null && i.NameEn.ToLower().Contains(term)))
            .OrderBy(i => i.Code)
            .Take(limit)
            .Select(i => new Icd10Item(i.Id, i.Code, i.Name, i.NameEn))
            .ToList();

        return Ok(results);
    }

    // ── PRODUCT / DRUG SEARCH ─────────────────────────────────────────────
    /// <summary>Search products/drugs by name or code. type=1 for medicines.</summary>
    [HttpGet("products")]
    public ActionResult<IEnumerable<ProductItem>> SearchProducts(
        [FromQuery] string? search,
        [FromQuery] int? type,
        [FromQuery] int limit = 20)
    {
        var query = db.Products.Where(p => p.IsActive && p.DeletedDate == null);

        if (type.HasValue)
            query = query.Where(p => p.Type == type.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.Code.ToLower().Contains(term) ||
                p.Name.ToLower().Contains(term));
        }

        var results = query
            .OrderBy(p => p.Name)
            .Take(limit)
            .Select(p => new ProductItem(p.Id, p.Code, p.Name, p.Type, p.Unit))
            .ToList();

        return Ok(results);
    }

    // ── DOCTORS ───────────────────────────────────────────────────────────
    [HttpGet("doctors")]
    public ActionResult<IEnumerable<DoctorItem>> ListDoctors()
    {
        var doctors = db.Doctors
            .Where(d => d.IsActive)
            .OrderBy(d => d.FirstName)
            .Select(d => new DoctorItem(d.Id, d.PreName, d.FirstName, d.LastName, d.Specialty))
            .ToList();

        return Ok(doctors);
    }

    // ── DIVISIONS ─────────────────────────────────────────────────────────
    [HttpGet("divisions")]
    public ActionResult<IEnumerable<DivisionItem>> ListDivisions()
    {
        var divisions = db.Divisions
            .Where(d => d.IsActive && d.DeletedDate == null)
            .OrderBy(d => d.Code)
            .Select(d => new DivisionItem(d.Id, d.Code, d.Name))
            .ToList();

        return Ok(divisions);
    }
}

// ── RECORDS ───────────────────────────────────────────────────────────────
public record Icd10Item(string Id, string Code, string Name, string? NameEn);
public record ProductItem(string Id, string Code, string Name, int Type, string? Unit);
public record DoctorItem(string Id, string? PreName, string FirstName, string LastName, string? Specialty);
public record DivisionItem(string Id, string Code, string Name);
