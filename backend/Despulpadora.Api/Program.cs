using Despulpadora.Api.Hubs;
using Despulpadora.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddHttpClient();

// Dependency Injection
builder.Services.AddSingleton<IVoiceOrderRepository, VoiceOrderRepository>();
builder.Services.AddScoped<IWhatsAppMediaService, WhatsAppMediaService>();
builder.Services.AddScoped<IWhatsAppMessagingService, WhatsAppMessagingService>();

// CORS configuration for Angular frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularAppPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200", "http://127.0.0.1:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AngularAppPolicy");

app.UseRouting();

app.MapControllers();

// SignalR Hub Endpoint for real-time voice order notifications
app.MapHub<VoiceOrdersHub>("/hubs/voice-orders");

app.Run();
