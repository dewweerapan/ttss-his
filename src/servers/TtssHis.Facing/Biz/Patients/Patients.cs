using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing.Biz.Patients;

[ApiController]
[Route("api/patients")]
[Authorize]
public sealed class Patients(HisDbContext db) : ControllerBase
{
    [HttpGet]
    public ActionResult<PatientListResponse> List(
        [FromQuery] string? search,
        [FromQuery] string? hn,
        [FromQuery] int pageNo = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = db.Patients.Where(p => p.DeletedDate == null && p.IsActive);

        if (!string.IsNullOrWhiteSpace(hn))
            query = query.Where(p => p.Hn == hn.Trim());
        else if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p =>
                p.Hn.ToLower().Contains(term) ||
                p.FirstName.ToLower().Contains(term) ||
                p.LastName.ToLower().Contains(term) ||
                (p.CitizenNo != null && p.CitizenNo.Contains(term)));
        }

        var total = query.Count();
        var items = query
            .OrderBy(p => p.Hn)
            .Skip((pageNo - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PatientSummary(p.Id, p.Hn, p.PreName, p.FirstName, p.LastName, p.Gender, p.Birthdate, p.PhoneNumber))
            .ToList();

        return Ok(new PatientListResponse(items, total, pageNo, pageSize));
    }

    [HttpGet("{id}")]
    public ActionResult<PatientDetail> Get(string id)
    {
        var p = db.Patients
            .Where(p => p.Id == id && p.DeletedDate == null)
            .FirstOrDefault();

        if (p is null) return NotFound();
        return Ok(ToDetail(p));
    }

    [HttpPost]
    public async Task<ActionResult<PatientDetail>> Create([FromBody] CreatePatientRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
            return BadRequest("FirstName and LastName are required.");

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var count = db.Patients.Count(p => p.Hn.StartsWith("HN" + today));
        var hn = $"HN{today}{(count + 1):D4}";

        var patient = new Shared.Entities.Patient.Patient
        {
            Id = Guid.NewGuid().ToString(),
            Hn = hn,
            PreName = request.PreName,
            FirstName = request.FirstName,
            LastName = request.LastName,
            PreNameEn = request.PreNameEn,
            FirstNameEn = request.FirstNameEn,
            LastNameEn = request.LastNameEn,
            Gender = request.Gender,
            Birthdate = request.Birthdate,
            CitizenType = request.CitizenType ?? "T",
            CitizenNo = request.CitizenNo,
            PassportNo = request.PassportNo,
            BloodGroup = request.BloodGroup,
            NationalityCode = request.NationalityCode ?? "099",
            PhoneNumber = request.PhoneNumber,
            CreatedBy = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
            CreatedDate = DateTime.UtcNow,
        };

        db.Patients.Add(patient);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = patient.Id }, ToDetail(patient));
    }

    // ── UPDATE ALLERGY ─────────────────────────────────────────────────────
    [HttpPatch("{id}/allergy")]
    public async Task<ActionResult<PatientDetail>> UpdateAllergy(string id, [FromBody] UpdateAllergyRequest req)
    {
        var patient = await db.Patients.FirstOrDefaultAsync(p => p.Id == id && p.DeletedDate == null);
        if (patient is null) return NotFound();

        patient.Allergy      = req.Allergy;
        patient.AllergyNote  = req.AllergyNote;
        patient.LastUpdatedDate = DateTime.UtcNow;
        patient.UpdatedBy    = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        await db.SaveChangesAsync();
        return Ok(ToDetail(patient));
    }

    private static PatientDetail ToDetail(Shared.Entities.Patient.Patient p) =>
        new(p.Id, p.Hn, p.PreName, p.FirstName, p.LastName,
            p.PreNameEn, p.FirstNameEn, p.LastNameEn,
            p.Gender, p.Birthdate, p.CitizenType, p.CitizenNo,
            p.BloodGroup, p.NationalityCode, p.PhoneNumber,
            p.IsAlive, p.CreatedDate, p.Allergy, p.AllergyNote);
}

public record PatientSummary(string Id, string Hn, string? PreName, string FirstName, string LastName,
    int Gender, DateOnly? Birthdate, string? PhoneNumber);

public record PatientDetail(string Id, string Hn, string? PreName, string FirstName, string LastName,
    string? PreNameEn, string? FirstNameEn, string? LastNameEn,
    int Gender, DateOnly? Birthdate, string CitizenType, string? CitizenNo,
    string? BloodGroup, string NationalityCode, string? PhoneNumber,
    bool IsAlive, DateTime CreatedDate,
    string? Allergy, string? AllergyNote);

public record PatientListResponse(IEnumerable<PatientSummary> Items, int Total, int PageNo, int PageSize);

public record CreatePatientRequest(
    string? PreName, string FirstName, string LastName,
    string? PreNameEn, string? FirstNameEn, string? LastNameEn,
    int Gender, DateOnly? Birthdate,
    string? CitizenType, string? CitizenNo, string? PassportNo,
    string? BloodGroup, string? NationalityCode,
    string? PhoneNumber);

public record UpdateAllergyRequest(string? Allergy, string? AllergyNote);
