using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TtssHis.Facing.Services;
using TtssHis.Shared.DbContexts;

namespace TtssHis.Facing;

public sealed class WebInitializer(IConfiguration configuration, IWebHostEnvironment environment)
{
    public void RegisterServices(IServiceCollection services)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidDataException("DefaultConnection is not found.");

        services.AddDbContext<HisDbContext>(opt => opt.UseNpgsql(connectionString));

        var jwtSection = configuration.GetRequiredSection("Jwt");
        var jwtKey = jwtSection["Key"] ?? throw new InvalidDataException("Jwt:Key is not found.");
        var jwtIssuer = jwtSection["Issuer"] ?? throw new InvalidDataException("Jwt:Issuer is not found.");
        var jwtAudience = jwtSection["Audience"] ?? throw new InvalidDataException("Jwt:Audience is not found.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opt =>
            {
                opt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtIssuer,
                    ValidAudience = jwtAudience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                };
            });

        services.AddAuthorization();
        services.AddScoped<JwtTokenService>();
    }
}
