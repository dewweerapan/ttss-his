using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Database.Migrations;

public class HisDbContextFactory : IDesignTimeDbContextFactory<HisDbContext>
{
    public HisDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<HisDbContext>();
        optionsBuilder.UseNpgsql(
            "Host=localhost;Port=5432;Database=ttss_his;Username=his_user;Password=his_password",
            cfg => cfg.MigrationsAssembly("TtssHis.Database.Migrations"));
        return new HisDbContext(optionsBuilder.Options);
    }
}
