using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Despulpadora.Api.Models;

namespace Despulpadora.Api.Services;

public class WhatsAppMessagingService : IWhatsAppMessagingService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private readonly ILogger<WhatsAppMessagingService> _logger;

    public WhatsAppMessagingService(HttpClient httpClient, IConfiguration config, ILogger<WhatsAppMessagingService> logger)
    {
        _httpClient = httpClient;
        _config = config;
        _logger = logger;
    }

    public string FormatOrderConfirmationMessage(ConfirmOrderDto confirmation)
    {
        var sb = new StringBuilder();
        var itemsSummary = string.Join(", ", confirmation.Items.Select(i => $"{i.Quantity}x {i.FruitName} ({i.Grammage}g)"));
        var formattedTotal = string.Format(new System.Globalization.CultureInfo("es-CO"), "{0:C0}", confirmation.TotalAmount);

        sb.AppendLine("🥭 *¡Confirmación de Pedido - Despulpadora DGL!* 🍍");
        sb.AppendLine();
        sb.AppendLine($"Hola *{confirmation.CustomerName}*, hemos recibido y digitado tu pedido por audio exitosamente:");
        sb.AppendLine();

        foreach (var item in confirmation.Items)
        {
            var unitFormatted = string.Format(new System.Globalization.CultureInfo("es-CO"), "{0:C0}", item.UnitPrice);
            var subtotalFormatted = string.Format(new System.Globalization.CultureInfo("es-CO"), "{0:C0}", item.Subtotal);
            sb.AppendLine($"• *{item.Quantity}x* {item.FruitName} {item.Grammage}g ({unitFormatted} c/u) = {subtotalFormatted}");
        }

        sb.AppendLine();
        sb.AppendLine($"💰 *TOTAL A PAGAR:* {formattedTotal} COP");

        if (!string.IsNullOrWhiteSpace(confirmation.DeliveryAddress))
        {
            sb.AppendLine($"📍 *Entrega:* {confirmation.DeliveryAddress}");
        }

        if (!string.IsNullOrWhiteSpace(confirmation.EstimatedDeliveryTime))
        {
            sb.AppendLine($"⏱️ *Horario estimado:* {confirmation.EstimatedDeliveryTime}");
        }

        if (!string.IsNullOrWhiteSpace(confirmation.CustomNote))
        {
            sb.AppendLine($"📝 *Observación:* {confirmation.CustomNote}");
        }

        sb.AppendLine();
        sb.AppendLine("Tu orden ha sido registrada en cava y pasará a alistamiento para despacho.");
        sb.AppendLine("¡Muchas gracias por tu compra!");

        return sb.ToString();
    }

    public async Task<WhatsAppSendResult> SendOrderConfirmationAsync(ConfirmOrderDto confirmation)
    {
        var formattedMessage = FormatOrderConfirmationMessage(confirmation);
        var accessToken = _config["WhatsApp:AccessToken"];
        var phoneNumberId = _config["WhatsApp:PhoneNumberId"];

        // If credentials are not set, return simulated success
        if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(phoneNumberId))
        {
            _logger.LogInformation("WhatsApp Cloud API credentials not configured. Simulating dispatch to {Phone}:\n{Message}",
                confirmation.CustomerPhone, formattedMessage);

            return new WhatsAppSendResult
            {
                Success = true,
                MessageId = $"wamid.simulated_{Guid.NewGuid():N}",
                FormattedMessage = formattedMessage,
                SentAt = DateTime.UtcNow
            };
        }

        try
        {
            // Normalize phone number (digits only)
            var cleanPhone = new string(confirmation.CustomerPhone.Where(char.IsDigit).ToArray());

            var payload = new
            {
                messaging_product = "whatsapp",
                recipient_type = "individual",
                to = cleanPhone,
                type = "text",
                text = new
                {
                    preview_url = false,
                    body = formattedMessage
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, $"https://graph.facebook.com/v21.0/{phoneNumberId}/messages")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Meta Cloud API send message failed: {StatusCode} {Response}", response.StatusCode, responseContent);
                return new WhatsAppSendResult
                {
                    Success = false,
                    Error = $"Meta API error ({response.StatusCode}): {responseContent}",
                    FormattedMessage = formattedMessage
                };
            }

            _logger.LogInformation("WhatsApp confirmation sent successfully to {Phone}: {Response}", cleanPhone, responseContent);
            return new WhatsAppSendResult
            {
                Success = true,
                MessageId = $"wamid.meta_{Guid.NewGuid():N}",
                FormattedMessage = formattedMessage,
                SentAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error sending WhatsApp confirmation to {Phone}", confirmation.CustomerPhone);
            return new WhatsAppSendResult
            {
                Success = false,
                Error = ex.Message,
                FormattedMessage = formattedMessage
            };
        }
    }
}
