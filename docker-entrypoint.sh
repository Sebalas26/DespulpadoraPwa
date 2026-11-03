#!/bin/sh
set -e

# Start WhatsApp Multi-Device Gateway microservice with auto-restart supervision
if [ -f "/app/whatsapp-gateway/server.js" ]; then
  echo "[Production] Starting WhatsAppQrGateway supervisor on port 3005..."
  (
    while true; do
      node /app/whatsapp-gateway/server.js 2>&1 | tee -a /var/log/whatsapp-gateway.log
      echo "[Production] WhatsAppQrGateway exited. Restarting in 2 seconds..."
      sleep 2
    done
  ) &
fi

# Execute Nginx foreground process
exec nginx -g "daemon off;"
