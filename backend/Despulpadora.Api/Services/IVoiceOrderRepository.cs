using Despulpadora.Api.Models;

namespace Despulpadora.Api.Services;

public interface IVoiceOrderRepository
{
    Task<IEnumerable<VoiceOrderMessage>> GetAllAsync(VoiceOrderStatus? status = null);
    Task<VoiceOrderMessage?> GetByIdAsync(string id);
    Task<VoiceOrderMessage?> GetByWhatsAppMessageIdAsync(string waMessageId);
    Task<VoiceOrderMessage> AddAsync(VoiceOrderMessage order);
    Task<VoiceOrderMessage?> UpdateStatusAsync(string id, VoiceOrderStatus status, int? orderId = null, string? operatorName = null);
    Task<bool> DeleteAsync(string id);
}
