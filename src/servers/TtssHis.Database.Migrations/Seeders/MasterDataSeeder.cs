using TtssHis.Shared.Constants;
using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Core;
using TtssHis.Shared.Entities.Insurance;
using TtssHis.Shared.Entities.Product;

namespace TtssHis.Database.Migrations.Seeders;

public static class MasterDataSeeder
{
    public static async Task SeedAsync(HisDbContext db)
    {
        await SeedDivisionsAsync(db);
        await SeedDoctorsAsync(db);
        await SeedUsersAsync(db);
        await SeedCoveragesAsync(db);
        await SeedProductsAsync(db);
        await SeedWardsAsync(db);
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
            new User { Id = "user-admin-001", Username = "admin", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin1234!"), FirstName = "ผู้ดูแล", LastName = "ระบบ", RoleId = RoleConstants.RoleId.Doctor, IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-doctor-001", Username = "doctor1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("doctor1234"), FirstName = "สมชาย", LastName = "ใจดี", RoleId = RoleConstants.RoleId.Doctor, DoctorId = "doc-001", IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-doctor-002", Username = "doctor2", PasswordHash = BCrypt.Net.BCrypt.HashPassword("doctor1234"), FirstName = "สมหญิง", LastName = "รักษา", RoleId = RoleConstants.RoleId.Doctor, DoctorId = "doc-002", IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-nurse-001", Username = "nurse1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("nurse1234"), FirstName = "วันเพ็ญ", LastName = "ดูแล", RoleId = RoleConstants.RoleId.Nurse, IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-pharmacist-001", Username = "pharmacist1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("pharma1234"), FirstName = "ประไพ", LastName = "จ่ายยา", RoleId = RoleConstants.RoleId.Pharmacist, IsActive = true, CreatedDate = DateTime.UtcNow },
            new User { Id = "user-finance-001", Username = "finance1", PasswordHash = BCrypt.Net.BCrypt.HashPassword("finance1234"), FirstName = "มานะ", LastName = "การเงิน", RoleId = RoleConstants.RoleId.Finance, IsActive = true, CreatedDate = DateTime.UtcNow },
        };
        await db.Users.AddRangeAsync(users);
    }

    private static async Task SeedProductsAsync(HisDbContext db)
    {
        if (db.Products.Any()) return;

        var now = DateTime.UtcNow;
        var effective = new DateOnly(2026, 1, 1);

        var items = new[]
        {
            ("prod-pcm500",  "PCM500",  "พาราเซตามอล 500mg",        1, "เม็ด",     2.00m),
            ("prod-amx500",  "AMX500",  "อะม็อกซีซิลิน 500mg",       1, "แคปซูล",  5.00m),
            ("prod-ibu400",  "IBU400",  "ไอบูโพรเฟน 400mg",          1, "เม็ด",     4.00m),
            ("prod-ome20",   "OME20",   "โอมีพราโซล 20mg",           1, "แคปซูล",  8.00m),
            ("prod-atr10",   "ATR10",   "อะทอร์วาสแตติน 10mg",       1, "เม็ด",     6.00m),
            ("prod-met500",  "MET500",  "เมทฟอร์มิน 500mg",          1, "เม็ด",     3.00m),
            ("prod-aml5",    "AML5",    "แอมโลดิพีน 5mg",            1, "เม็ด",     5.00m),
            ("prod-enl5",    "ENL5",    "อีนาลาพริล 5mg",            1, "เม็ด",     4.00m),
            ("prod-cpm4",    "CPM4",    "คลอร์เฟนิรามีน 4mg",        1, "เม็ด",     1.50m),
            ("prod-dxm15",   "DXM15",   "เดกซ์โทรเมทอร์แฟน 15mg",   1, "เม็ด",     2.00m),
            ("prod-asa81",   "ASA81",   "แอสไพริน 81mg",             1, "เม็ด",     1.00m),
            ("prod-sim20",   "SIM20",   "ซิมวาสแตติน 20mg",          1, "เม็ด",     5.00m),
            ("prod-mnz200",  "MNZ200",  "เมโทรนิดาโซล 200mg",        1, "เม็ด",     3.00m),
            ("prod-cex500",  "CEX500",  "เซฟาเล็กซิน 500mg",         1, "แคปซูล",  7.00m),
            ("prod-prd5",    "PRD5",    "เพรดนิโซโลน 5mg",           1, "เม็ด",     3.00m),
            ("prod-lop2",    "LOP2",    "โลเปอราไมด์ 2mg",           1, "แคปซูล",  4.00m),
            ("prod-ant",     "ANT5",    "แอนตาซิดผสม",               1, "ช้อนชา",  2.00m),
            ("prod-vitc",    "VIT_C",   "วิตามินซี 500mg",            1, "เม็ด",     1.50m),
            ("prod-zncox",   "ZNC_OX",  "สังกะสีออกไซด์ครีม",         1, "หลอด",   25.00m),
            ("prod-opd-fee", "OPD_FEE", "ค่าตรวจ OPD",               2, "ครั้ง",  150.00m),
        };

        foreach (var (id, code, name, type, unit, price) in items)
        {
            await db.Products.AddAsync(new Product
            {
                Id          = id,
                Code        = code,
                Name        = name,
                Type        = type,
                Unit        = unit,
                IsBillable  = true,
                IsActive    = true,
                CreatedDate = now,
            });

            await db.Pricings.AddAsync(new Pricing
            {
                Id            = $"price-{id}",
                ProductId     = id,
                CoverageId    = null,
                PriceNormal   = price,
                PriceSpecial  = price,
                PriceForeign  = price * 2,
                EffectiveDate = effective,
                IsActive      = true,
                CreatedDate   = now,
            });
        }
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

    private static async Task SeedWardsAsync(HisDbContext db)
    {
        if (db.Wards.Any()) return;

        var now = DateTime.UtcNow;

        var wards = new[]
        {
            ("ward-gen", "GEN", "หอผู้ป่วยทั่วไป", 1, 10),
            ("ward-icu", "ICU", "หน่วยดูแลผู้ป่วยวิกฤต", 2, 6),
        };

        foreach (var (wardId, code, name, type, totalBeds) in wards)
        {
            await db.Wards.AddAsync(new TtssHis.Shared.Entities.Ipd.Ward
            {
                Id          = wardId,
                Code        = code,
                Name        = name,
                Type        = type,
                TotalBeds   = totalBeds,
                IsActive    = true,
                CreatedDate = now,
            });

            for (var i = 1; i <= totalBeds; i++)
            {
                await db.Beds.AddAsync(new TtssHis.Shared.Entities.Ipd.Bed
                {
                    Id          = $"{wardId}-bed-{i:D2}",
                    BedNo       = $"{code}{i:D2}",
                    WardId      = wardId,
                    Status      = 1,
                    IsActive    = true,
                    CreatedDate = now,
                });
            }
        }
    }
}
