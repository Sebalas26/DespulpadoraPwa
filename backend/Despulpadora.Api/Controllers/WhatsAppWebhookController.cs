using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Despulpadora.Api.Hubs;
using Despulpadora.Api.Models;
using Despulpadora.Api.Services;

namespace Despulpadora.Api.Controllers;

[ApiController]
[Route("api/whatsapp")]
public class WhatsAppWebhookController : ControllerBase
{
    private readonly IVoiceOrderRepository _repository;
    private readonly IWhatsAppMediaService _mediaService;
    private readonly IWhatsAppMessagingService _messagingService;
    private readonly IHubContext<VoiceOrdersHub, IVoiceOrdersClient> _hubContext;
    private readonly IConfiguration _config;
    private readonly ILogger<WhatsAppWebhookController> _logger;

    public WhatsAppWebhookController(
        IVoiceOrderRepository repository,
        IWhatsAppMediaService mediaService,
        IWhatsAppMessagingService messagingService,
        IHubContext<VoiceOrdersHub, IVoiceOrdersClient> hubContext,
        IConfiguration config,
        ILogger<WhatsAppWebhookController> logger)
    {
        _repository = repository;
        _mediaService = mediaService;
        _messagingService = messagingService;
        _hubContext = hubContext;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Meta Webhook Verification endpoint (hub.mode, hub.verify_token, hub.challenge)
    /// </summary>
    [HttpGet("webhook")]
    public IActionResult VerifyWebhook(
        [FromQuery(Name = "hub.mode")] string? mode,
        [FromQuery(Name = "hub.verify_token")] string? token,
        [FromQuery(Name = "hub.challenge")] string? challenge)
    {
        var expectedToken = _config["WhatsApp:VerifyToken"] ?? "despulpadora_webhook_token_2026";
        _logger.LogInformation("Meta Webhook verification requested. Mode: {Mode}, Token: {Token}", mode, token);

        if (mode == "subscribe" && token == expectedToken)
        {
            _logger.LogInformation("Meta Webhook verification succeeded.");
            return Ok(challenge);
        }

        _logger.LogWarning("Meta Webhook verification failed. Token mismatch.");
        return StatusCode(StatusCodes.Status403Forbidden, "Verification token mismatch");
    }

    /// <summary>
    /// Meta Webhook Event Receiver: detects type == 'audio', fetches media URL, saves and notifies SignalR
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> ReceiveWebhook([FromBody] MetaWebhookPayload payload)
    {
        try
        {
            if (payload?.Entry == null || payload.Entry.Count == 0)
            {
                return Ok();
            }

            foreach (var entry in payload.Entry)
            {
                foreach (var change in entry.Changes)
                {
                    var messages = change.Value?.Messages;
                    if (messages == null || messages.Count == 0) continue;

                    // Extract contact name if available
                    var contacts = change.Value?.Contacts;
                    var contactNameMap = contacts?.ToDictionary(c => c.WaId, c => c.Profile?.Name ?? string.Empty)
                                         ?? new Dictionary<string, string>();

                    foreach (var msg in messages)
                    {
                        // Check if the message is an audio / voice note
                        if (string.Equals(msg.Type, "audio", StringComparison.OrdinalIgnoreCase) && msg.Audio != null)
                        {
                            var mediaId = msg.Audio.Id;
                            var fromPhone = msg.From;
                            var customerName = contactNameMap.TryGetValue(fromPhone, out var name) && !string.IsNullOrWhiteSpace(name)
                                ? name
                                : $"Cliente WhatsApp ({fromPhone})";

                            _logger.LogInformation("🎙️ Audio message detected! MessageId: {MessageId}, MediaId: {MediaId}, From: {From}",
                                msg.Id, mediaId, fromPhone);

                            // 1. Asynchronously retrieve media URL from Meta Graph API
                            var audioUrl = await _mediaService.GetMediaDownloadUrlAsync(mediaId);

                            // 2. Persist voice order as 'Pending' in database
                            var newVoiceOrder = new VoiceOrderMessage
                            {
                                WhatsAppMessageId = msg.Id,
                                SenderPhone = fromPhone.StartsWith("+") ? fromPhone : $"+{fromPhone}",
                                CustomerName = customerName,
                                MediaId = mediaId,
                                AudioUrl = audioUrl,
                                MimeType = msg.Audio.MimeType ?? "audio/ogg; codecs=opus",
                                Status = VoiceOrderStatus.Pending,
                                ReceivedAt = DateTime.UtcNow,
                                TranscriptPreview = "Nota de voz recibida vía WhatsApp Business. Escucha el audio para digitar el pedido."
                            };

                            var savedOrder = await _repository.AddAsync(newVoiceOrder);

                            // 3. Immediately notify all connected Angular frontends via SignalR WebSockets
                            await _hubContext.Clients.All.ReceiveNewVoiceOrder(savedOrder);
                            _logger.LogInformation("SignalR real-time notification sent for voice order {Id}", savedOrder.Id);
                        }
                    }
                }
            }

            return Ok(new { status = "received" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing WhatsApp webhook payload");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Simulates receiving an incoming voice order from WhatsApp for easy local testing & demo
    /// </summary>
    [HttpPost("webhook/simulate-audio")]
    public async Task<IActionResult> SimulateIncomingAudio([FromBody] SimulateAudioWebhookDto dto)
    {
        var randomMediaId = $"sim_media_{Guid.NewGuid():N}";
        var phone = string.IsNullOrWhiteSpace(dto.SenderPhone) ? "+57 311 234 5678" : dto.SenderPhone;
        var name = string.IsNullOrWhiteSpace(dto.CustomerName) ? "Restaurante La Casona (María Santos)" : dto.CustomerName;

        var voiceOrder = new VoiceOrderMessage
        {
            WhatsAppMessageId = $"wamid.sim_{Guid.NewGuid():N}",
            SenderPhone = phone,
            CustomerName = name,
            MediaId = randomMediaId,
            AudioUrl = $"/api/whatsapp/media/{randomMediaId}",
            MimeType = "audio/wav",
            DurationSeconds = dto.DurationSeconds ?? 12.0,
            Status = VoiceOrderStatus.Pending,
            ReceivedAt = DateTime.UtcNow,
            TranscriptPreview = dto.TranscriptHint ?? "Hola, por favor me envían 6 pulpas de maracuyá de kilo y 4 de lulo de 250 gramos para el restaurante. Pago por Nequi."
        };

        var saved = await _repository.AddAsync(voiceOrder);

        // Broadcast to Angular clients
        await _hubContext.Clients.All.ReceiveNewVoiceOrder(saved);

        _logger.LogInformation("Simulated incoming voice order broadcasted: {Id} from {Name}", saved.Id, saved.CustomerName);
        return Ok(saved);
    }

    /// <summary>
    /// List all voice orders (optionally filtered by status)
    /// </summary>
    [HttpGet("voice-orders")]
    public async Task<IActionResult> GetVoiceOrders([FromQuery] VoiceOrderStatus? status)
    {
        var orders = await _repository.GetAllAsync(status);
        return Ok(orders);
    }

    /// <summary>
    /// Get details of a single voice order
    /// </summary>
    [HttpGet("voice-orders/{id}")]
    public async Task<IActionResult> GetVoiceOrderById(string id)
    {
        var order = await _repository.GetByIdAsync(id);
        if (order == null) return NotFound(new { error = "Voice order not found" });
        return Ok(order);
    }

    /// <summary>
    /// Audio streaming proxy for HTML5 <audio> player
    /// </summary>
    [HttpGet("media/{mediaId}")]
    public async Task<IActionResult> StreamAudio(string mediaId)
    {
        var (stream, contentType) = await _mediaService.GetAudioStreamAsync(mediaId);
        Response.Headers.Append("Accept-Ranges", "bytes");
        return File(stream, contentType, enableRangeProcessing: true);
    }

    /// <summary>
    /// Update status of a voice order (e.g. marked as 'Processed')
    /// </summary>
    [HttpPost("voice-orders/{id}/process")]
    public async Task<IActionResult> MarkAsProcessed(string id, [FromQuery] int? orderId, [FromQuery] string? operatorName)
    {
        var updated = await _repository.UpdateStatusAsync(id, VoiceOrderStatus.Processed, orderId, operatorName);
        if (updated == null) return NotFound(new { error = "Voice order not found" });

        // Broadcast SignalR status update
        await _hubContext.Clients.All.VoiceOrderStatusUpdated(id, "PROCESSED", orderId);
        return Ok(updated);
    }

    /// <summary>
    /// Process the voice order, register created Order ID, and send automated confirmation to client via WhatsApp
    /// </summary>
    [HttpPost("voice-orders/{id}/confirm-and-send")]
    public async Task<IActionResult> ConfirmOrderAndSendWhatsApp(string id, [FromBody] ConfirmOrderDto confirmation)
    {
        var voiceOrder = await _repository.GetByIdAsync(id);
        if (voiceOrder == null) return NotFound(new { error = "Voice order not found" });

        // 1. Send automated WhatsApp confirmation message to client
        confirmation.CustomerPhone = voiceOrder.SenderPhone;
        confirmation.CustomerName = voiceOrder.CustomerName;
        confirmation.MessageId = id;

        var sendResult = await _messagingService.SendOrderConfirmationAsync(confirmation);

        // 2. Update status in database to Processed
        await _repository.UpdateStatusAsync(id, VoiceOrderStatus.Processed, confirmation.OrderId, "Administrador");

        // 3. Broadcast SignalR update
        await _hubContext.Clients.All.VoiceOrderStatusUpdated(id, "PROCESSED", confirmation.OrderId);

        return Ok(new
        {
            success = sendResult.Success,
            voiceOrderId = id,
            orderId = confirmation.OrderId,
            whatsAppResult = sendResult
        });
    }
}
