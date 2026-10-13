using System.Collections.Concurrent;
using Despulpadora.Api.Models;

namespace Despulpadora.Api.Services;

public class VoiceOrderRepository : IVoiceOrderRepository
{
    private readonly ConcurrentDictionary<string, VoiceOrderMessage> _orders = new();

    public VoiceOrderRepository()
    {
        SeedInitialSampleOrders();
    }

    private void SeedInitialSampleOrders()
    {
        var sample1 = new VoiceOrderMessage
        {
            Id = "vo_001_elportal",
            WhatsAppMessageId = "wamid.HBgLMzgxMjQ4OTM5MDUxFQIAEhggMjhGNjY0RjhGNjA0Q0UzM0JFQkU2MzE2RDYwOTI0NzEA",
            SenderPhone = "+57 310 456 7890",
            CustomerName = "Carlos Morales (Restaurante El Portal)",
            MediaId = "meta_media_maracuya_coco_001",
            AudioUrl = "/api/whatsapp/media/meta_media_maracuya_coco_001",
            MimeType = "audio/ogg; codecs=opus",
            FileSizeBytes = 48500,
            DurationSeconds = 14.5,
            Status = VoiceOrderStatus.Pending,
            ReceivedAt = DateTime.UtcNow.AddMinutes(-8),
            Notes = "Pedido para turno de almuerzo",
            TranscriptPreview = "Buenas tardes amigos de la despulpadora. Les habla Carlos de El Portal. Me envían por favor 5 paquetes de pulpa de maracuyá de kilo y 2 de limonada de coco de 140g para entregar antes de las 2pm. ¡Muchas gracias!"
        };

        var sample2 = new VoiceOrderMessage
        {
            Id = "vo_002_lacosecha",
            WhatsAppMessageId = "wamid.HBgLMzgxMjQ4OTM5MDUxFQIAEhggODg5Mzk0OTQ5NDk0ODg0ODg0ODg0ODg0ODg0ODg0ODgA",
            SenderPhone = "+57 320 890 1234",
            CustomerName = "Diana Gómez (Frutería La Cosecha)",
            MediaId = "meta_media_mango_lulo_002",
            AudioUrl = "/api/whatsapp/media/meta_media_mango_lulo_002",
            MimeType = "audio/ogg; codecs=opus",
            FileSizeBytes = 36200,
            DurationSeconds = 11.2,
            Status = VoiceOrderStatus.Pending,
            ReceivedAt = DateTime.UtcNow.AddMinutes(-24),
            Notes = "Pide verificar fecha de vencimiento",
            TranscriptPreview = "Hola equipo DGL, habla Diana. Necesitamos reponer 10 unidades de pulpa de mango tommy de 250 gramos y 4 de lulo de castilla de 500 gramos. Pago contraentrega en el local del centro."
        };

        _orders[sample1.Id] = sample1;
        _orders[sample2.Id] = sample2;
    }

    public Task<IEnumerable<VoiceOrderMessage>> GetAllAsync(VoiceOrderStatus? status = null)
    {
        var list = _orders.Values.OrderByDescending(o => o.ReceivedAt).AsEnumerable();
        if (status.HasValue)
        {
            list = list.Where(o => o.Status == status.Value);
        }
        return Task.FromResult(list);
    }

    public Task<VoiceOrderMessage?> GetByIdAsync(string id)
    {
        _orders.TryGetValue(id, out var order);
        return Task.FromResult(order);
    }

    public Task<VoiceOrderMessage?> GetByWhatsAppMessageIdAsync(string waMessageId)
    {
        var order = _orders.Values.FirstOrDefault(o => o.WhatsAppMessageId == waMessageId);
        return Task.FromResult(order);
    }

    public Task<VoiceOrderMessage> AddAsync(VoiceOrderMessage order)
    {
        _orders[order.Id] = order;
        return Task.FromResult(order);
    }

    public Task<VoiceOrderMessage?> UpdateStatusAsync(string id, VoiceOrderStatus status, int? orderId = null, string? operatorName = null)
    {
        if (_orders.TryGetValue(id, out var order))
        {
            order.Status = status;
            if (status == VoiceOrderStatus.Processed)
            {
                order.ProcessedAt = DateTime.UtcNow;
                if (orderId.HasValue) order.CreatedOrderId = orderId.Value;
                if (!string.IsNullOrWhiteSpace(operatorName)) order.ProcessedByOperator = operatorName;
            }
            return Task.FromResult<VoiceOrderMessage?>(order);
        }
        return Task.FromResult<VoiceOrderMessage?>(null);
    }

    public Task<bool> DeleteAsync(string id)
    {
        return Task.FromResult(_orders.TryRemove(id, out _));
    }
}
