using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Patient;

namespace TtssHis.Database.Migrations.Seeders;

public static class MockDataSeeder
{
    public static async Task SeedAsync(HisDbContext db)
    {
        await SeedPatientsAsync(db);
        await db.SaveChangesAsync();
        Console.WriteLine("Mock data seeded.");
    }

    private static async Task SeedPatientsAsync(HisDbContext db)
    {
        if (db.Patients.Any()) return;

        var random = new Random(42);
        var preNames = new[] { "นาย", "นาง", "นางสาว" };
        var firstNames = new[] { "สมชาย", "สมหญิง", "วิชัย", "มานี", "ประยุทธ", "สุดา", "วันดี", "ประเสริฐ", "นงนุช", "สมพร" };
        var lastNames = new[] { "ใจดี", "รักษา", "เก่งมาก", "สุขสบาย", "มีทรัพย์", "ดีงาม", "สมบูรณ์", "แสงทอง", "ดาวเรือง", "พงษ์ไทย" };

        var patients = Enumerable.Range(1, 100).Select(i =>
        {
            var pre = preNames[random.Next(preNames.Length)];
            var gender = pre == "นาย" ? 1 : 2;
            var birth = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-random.Next(1, 80)).AddDays(-random.Next(365)));
            return new Patient
            {
                Id = Guid.NewGuid().ToString(),
                Hn = $"HN2026{i:D6}",
                PreName = pre,
                FirstName = firstNames[random.Next(firstNames.Length)],
                LastName = lastNames[random.Next(lastNames.Length)],
                Gender = gender,
                Birthdate = birth,
                CitizenType = "T",
                CitizenNo = $"1{random.Next(100000000, 999999999):D9}3",
                NationalityCode = "099",
                PhoneNumber = $"08{random.Next(10000000, 99999999)}",
                IsAlive = true,
                IsActive = true,
                CreatedDate = DateTime.UtcNow,
            };
        }).ToList();

        await db.Patients.AddRangeAsync(patients);
    }
}
