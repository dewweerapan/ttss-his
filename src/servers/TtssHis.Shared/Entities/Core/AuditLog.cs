namespace TtssHis.Shared.Entities.Core;

public sealed class AuditLog
{
    public required string Id { get; set; }
    public required string Action { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? UserId { get; set; }
    public string? Username { get; set; }
    public string? Detail { get; set; }
    public DateTime CreatedDate { get; set; }
    public string? IpAddress { get; set; }
}
