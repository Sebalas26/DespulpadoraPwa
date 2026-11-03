#!/bin/sh
set -e

# Start WhatsApp Multi-Device Gateway microservice in the background
if [ -f "/app/whatsapp-gateway/server.js" ]; then
  echo "[Production] Starting WhatsAppQrGateway on port 3005..."
  node /app/whatsapp-gateway/server.js > /var/log/whatsapp-gateway.log 2>&1 &
fi

# Execute Nginx foreground process
exec nginx -g "daemon off;"

