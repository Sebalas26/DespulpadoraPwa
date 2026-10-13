using System.Text.Json.Serialization;

namespace Despulpadora.Api.Models;

/// <summary>
/// Status of an incoming voice note order
/// </summary>
public enum VoiceOrderStatus
{
    Pending,
    Processing,
    Processed,
    Cancelled
}

/// <summary>
/// Internal entity representing a voice order received from WhatsApp Business
/// </summary>
public class VoiceOrderMessage
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string WhatsAppMessageId { get; set; } = string.Empty;
    public string SenderPhone { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string MediaId { get; set; } = string.Empty;
    public string AudioUrl { get; set; } = string.Empty;
    public string MimeType { get; set; } = "audio/ogg; codecs=opus";
    public int FileSizeBytes { get; set; } = 0;
    public double DurationSeconds { get; set; } = 0;
    public VoiceOrderStatus Status { get; set; } = VoiceOrderStatus.Pending;
    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public int? CreatedOrderId { get; set; }
    public string? ProcessedByOperator { get; set; }
    public string? Notes { get; set; }
    public string? TranscriptPreview { get; set; }
}

/// <summary>
/// Payload sent from frontend when administrator finishes digitizing the order
/// </summary>
public class ConfirmOrderDto
{
    public string MessageId { get; set; } = string.Empty;
    public int? OrderId { get; set; }
    public string CustomerPhone { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public List<OrderItemSummaryDto> Items { get; set; } = new();
    public decimal TotalAmount { get; set; }
    public string DeliveryAddress { get; set; } = "Cava principal / Despacho a domicilio";
    public string? EstimatedDeliveryTime { get; set; }
    public string? CustomNote { get; set; }
}

public class OrderItemSummaryDto
{
    public string FruitName { get; set; } = string.Empty;
    public int Grammage { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Subtotal => Quantity * UnitPrice;
}

/// <summary>
/// DTO to simulate incoming audio from WhatsApp for testing
/// </summary>
public class SimulateAudioWebhookDto
{
    public string? CustomerName { get; set; }
    public string? SenderPhone { get; set; }
    public string? AudioUrl { get; set; }
    public double? DurationSeconds { get; set; }
    public string? TranscriptHint { get; set; }
}

/// <summary>
/// Response after sending WhatsApp confirmation message
/// </summary>
public class WhatsAppSendResult
{
    public bool Success { get; set; }
    public string? MessageId { get; set; }
    public string? FormattedMessage { get; set; }
    public string? Error { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}

// =========================================================================
// META WHATSAPP BUSINESS CLOUD API WEBHOOK SCHEMAS
// =========================================================================

public class MetaWebhookPayload
{
    [JsonPropertyName("object")]
    public string Object { get; set; } = string.Empty;

    [JsonPropertyName("entry")]
    public List<MetaWebhookEntry> Entry { get; set; } = new();
}

public class MetaWebhookEntry
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("changes")]
    public List<MetaWebhookChange> Changes { get; set; } = new();
}

public class MetaWebhookChange
{
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public MetaWebhookValue Value { get; set; } = new();
}

public class MetaWebhookValue
{
    [JsonPropertyName("messaging_product")]
    public string MessagingProduct { get; set; } = "whatsapp";

    [JsonPropertyName("metadata")]
    public MetaMetadata? Metadata { get; set; }

    [JsonPropertyName("contacts")]
    public List<MetaContact>? Contacts { get; set; }

    [JsonPropertyName("messages")]
    public List<MetaMessage>? Messages { get; set; }
}

public class MetaMetadata
{
    [JsonPropertyName("display_phone_number")]
    public string DisplayPhoneNumber { get; set; } = string.Empty;

    [JsonPropertyName("phone_number_id")]
    public string PhoneNumberId { get; set; } = string.Empty;
}

public class MetaContact
{
    [JsonPropertyName("profile")]
    public MetaProfile? Profile { get; set; }

    [JsonPropertyName("wa_id")]
    public string WaId { get; set; } = string.Empty;
}

public class MetaProfile
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class MetaMessage
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("from")]
    public string From { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty; // "audio", "text", "image", etc.

    [JsonPropertyName("audio")]
    public MetaAudioObject? Audio { get; set; }

    [JsonPropertyName("text")]
    public MetaTextObject? Text { get; set; }
}

public class MetaAudioObject
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty; // media_id

    [JsonPropertyName("mime_type")]
    public string MimeType { get; set; } = string.Empty;

    [JsonPropertyName("sha256")]
    public string? Sha256 { get; set; }

    [JsonPropertyName("voice")]
    public bool Voice { get; set; } // true if it's a voice note
}

public class MetaTextObject
{
    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;
}

public class MetaMediaUrlResponse
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("mime_type")]
    public string MimeType { get; set; } = string.Empty;

    [JsonPropertyName("sha256")]
    public string Sha256 { get; set; } = string.Empty;

    [JsonPropertyName("file_size")]
    public int FileSize { get; set; }

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}
