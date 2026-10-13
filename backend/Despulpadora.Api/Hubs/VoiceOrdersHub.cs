using Microsoft.AspNetCore.SignalR;
using Despulpadora.Api.Models;

namespace Despulpadora.Api.Hubs;

public interface IVoiceOrdersClient
{
    Task ReceiveNewVoiceOrder(VoiceOrderMessage order);
    Task VoiceOrderStatusUpdated(string messageId, string status, int? orderId);
    Task ClientJoined(string connectionId);
}

public class VoiceOrdersHub : Hub<IVoiceOrdersClient>
{
    private readonly ILogger<VoiceOrdersHub> _logger;

    public VoiceOrdersHub(ILogger<VoiceOrdersHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("SignalR Client connected: {ConnectionId}", Context.ConnectionId);
        await Clients.Caller.ClientJoined(Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("SignalR Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
