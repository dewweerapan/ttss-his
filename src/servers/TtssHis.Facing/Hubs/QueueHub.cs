// src/servers/TtssHis.Facing/Hubs/QueueHub.cs
using Microsoft.AspNetCore.SignalR;

namespace TtssHis.Facing.Hubs;

public sealed class QueueHub : Hub
{
    public async Task JoinDivision(string divisionId)
        => await Groups.AddToGroupAsync(Context.ConnectionId, divisionId);

    public async Task LeaveDivision(string divisionId)
        => await Groups.RemoveFromGroupAsync(Context.ConnectionId, divisionId);
}
