using TtssHis.Shared.Constants;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Core;
using TtssHis.Shared.Entities.Insurance;

namespace TtssHis.Database.Migrations.Seeders;

public static class MasterDataSeeder
{
    public static async Task SeedAsync(HisDbContext db)
    {
        await SeedDivisionsAsync(db);
        await SeedDoctorsAsync(db);
        await SeedUsersAsync(db);
        await SeedCoveragesAsync(db);
        await db.SaveChangesAsync();
        Console.WriteLine("Master data seeded.");
    }

    private static async Task SeedDivisionsAsync(HisDbContext db)
    {
        if (db.Divisions.Any()) return;

        var divisions = new[]
        {
            new Division { Id = "div-reg", Code = "REG", Name = "แผนกทะเบียน", NameEn = "Registration", Type = 9, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Division { Id = "div-opd", Code = "OPD", Name = "แผนกผู้ป่วยนอก", NameEn = "OPD", Type = 1, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Division { Id = "div-er", Code = "ER", Name = "แผนกอุบัติเหตุฉุกเฉิน", NameEn = "Emergency", Type = 3, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Division { Id = "div-lab", Code = "LAB", Name = "แผนกห้องปฏิบัติการ", NameEn = "Laboratory", Type = 5, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Division { Id = "div-pharmacy", Code = "PHARM", Name = "แผนกเภสัช", NameEn = "Pharmacy", Type = 4, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Division { Id = "div-billing", Code = "BIL", Name = "แผนกการเงิน", NameEn = "Billing", Type = 6, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Division { Id = "div-icu", Code = "ICU", Name = "แผนกผู้ป่วยวิกฤต", NameEn = "ICU", Type = 2, IsActive = true, CreatedDate = DateTime.UtcNow },
        };
        await db.Divisions.AddRangeAsync(divisions);
    }

    private static async Task SeedDoctorsAsync(HisDbContext db)
    {
        if (db.Doctors.Any()) return;

        var doctors = new[]
        {
            new Doctor { Id = "doc-001", LicenseNumber = "12345", PreName = "นพ.", FirstName = "สมชาย", LastName = "ใจดี", PreNameEn = "Dr.", FirstNameEn = "Somchai", LastNameEn = "Jaidee", Specialty = "อายุรกรรมทั่วไป", Gender = 1, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Doctor { Id = "doc-002", LicenseNumber = "23456", PreName = "พญ.", FirstName = "สมหญิง", LastName = "รักษา", PreNameEn = "Dr.", FirstNameEn = "Somying", LastNameEn = "Raksa", Specialty = "กุมารเวชกรรม", Gender = 2, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Doctor { Id = "doc-003", LicenseNumber = "34567", PreName = "นพ.", FirstName = "วิชัย", LastName = "เก่งมาก", PreNameEn = "Dr.", FirstNameEn = "Wichai", LastNameEn = "Gengmak", Specialty = "ศัลยกรรมทั่วไป", Gender = 1, IsActive = true, CreatedDate = DateTime.UtcNow },
        };
        await db.Doctors.AddRangeAsync(doctors);
    }

    private static async Task SeedUsersAsync(HisDbContext db)
    {
        if (db.Users.Any()) return;

        var users = new[]
        {
            new User { Id = "user-doctor-001", Username = "doctor1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("doctor1234"), FirstName = "สมชาย", LastName = "ใจดี", RoleId = RoleConstants.RoleId.Doctor, DoctorId = "doc-001", IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-doctor-002", Username = "doctor2", PasswordHash = BCrypt.Net.BCrypt.HashPassword("doctor1234"), FirstName = "สมหญิง", LastName = "รักษา", RoleId = RoleConstants.RoleId.Doctor, DoctorId = "doc-002", IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-nurse-001", Username = "nurse1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("nurse1234"), FirstName = "วันเพ็ญ", LastName = "ดูแล", RoleId = RoleConstants.RoleId.Nurse, IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-pharmacist-001", Username = "pharmacist1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("pharma1234"), FirstName = "ประไพ", LastName = "จ่ายยา", RoleId = RoleConstants.RoleId.Pharmacist, IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-finance-001", Username = "finance1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("finance1234"), FirstName = "มานะ", LastName = "การเงิน", RoleId = RoleConstants.RoleId.Finance, IsActive = true, CreatedDate = DateTime.UtcNow },
        };
        await db.Users.AddRangeAsync(users);
    }

    private static async Task SeedCoveragesAsync(HisDbContext db)
    {
        if (db.Coverages.Any()) return;

        var coverages = new[]
        {
            new Coverage { Id = "cov-selfpay", Code = "CASH", Name = "ชำระเงินเอง", NameEn = "Self Pay", Type = 3, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Coverage { Id = "cov-uc", Code = "UC", Name = "สิทธิบัตรทอง (UCS)", NameEn = "Universal Coverage", Type = 1, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Coverage { Id = "cov-sso", Code = "SSO", Name = "ประกันสังคม", NameEn = "Social Security", Type = 1, IsActive = true, CreatedDate = DateTime.UtcNow },
            new Coverage { Id = "cov-civil", Code = "CIVIL", Name = "สวัสดิการข้าราชการ", NameEn = "Civil Servant", Type = 1, IsActive = true, CreatedDate = DateTime.UtcNow },
        };
        await db.Coverages.AddRangeAsync(coverages);
    }
}
