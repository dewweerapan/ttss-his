using Microsoft.EntityFrameworkCore;
using System.Reflection;
using TtssHis.Database.Migrations.Seeders;
using TtssHis.Shared.DbContexts;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<HisDbContext>(SetupPostgresMigration);
var app = builder.Build();

await using var scope = app.Services.CreateAsyncScope();
var db = scope.ServiceProvider.GetRequiredService<HisDbContext>();

await db.Database.MigrateAsync();
Console.WriteLine("Migration complete.");

await MasterDataSeeder.SeedAsync(db);
await MockDataSeeder.SeedAsync(db);
Console.WriteLine("All seeding complete.");

void SetupPostgresMigration(DbContextOptionsBuilder b)
    => b.UseNpgsql(GetConnectionString(), cfg =>
        cfg.MigrationsAssembly(Assembly.GetExecutingAssembly().FullName));

string GetConnectionString()
    => builder.Configuration.GetConnectionString("DefaultConnection")
       ?? throw new InvalidDataException("DefaultConnection is not found.");
