using TtssHis.Shared.DbContexts;
using TtssHis.Shared.Entities.Core;

namespace TtssHis.Facing.Services;

public interface IHisAuditService
{
    Task LogAsync(string action, string? entityType = null, string? entityId = null, string? detail = null);
}

public sealed class HisAuditService(HisDbContext db, IHttpContextAccessor http) : IHisAuditService
{
    public async Task LogAsync(string action, string? entityType = null, string? entityId = null, string? detail = null)
    {
        var user = http.HttpContext?.User;
        db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid().ToString(),
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            UserId = user?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
            Username = user?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value,
            Detail = detail,
            CreatedDate = DateTime.UtcNow,
            IpAddress = http.HttpContext?.Connection.RemoteIpAddress?.ToString(),
        });
        await db.SaveChangesAsync();
    }
}
