using Despulpadora.Api.Models;

namespace Despulpadora.Api.Services;

public interface IWhatsAppMessagingService
{
    Task<WhatsAppSendResult> SendOrderConfirmationAsync(ConfirmOrderDto confirmation);
    string FormatOrderConfirmationMessage(ConfirmOrderDto confirmation);
}
