using Despulpadora.Api.Models;

namespace Despulpadora.Api.Services;

public interface IWhatsAppMediaService
{
    Task<string> GetMediaDownloadUrlAsync(string mediaId);
    Task<(Stream stream, string contentType)> GetAudioStreamAsync(string mediaId);
}
