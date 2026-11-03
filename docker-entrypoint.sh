#!/bin/sh
set -e

# Start WhatsApp Multi-Device Gateway microservice on dedicated internal port 3005 (immune to PaaS PORT=80)
if [ -f "/app/whatsapp-gateway/server.js" ]; then
  echo "[Production] Starting WhatsAppQrGateway supervisor on port 3005..."
  (
    while true; do
      WHATSAPP_GATEWAY_PORT=3005 node /app/whatsapp-gateway/server.js 2>&1 | tee -a /var/log/whatsapp-gateway.log
      echo "[Production] WhatsAppQrGateway exited. Restarting in 2 seconds..."
      sleep 2
    done
  ) &

  # Wait up to 5 seconds for port 3005 to be ready before handing foreground to Nginx
  i=0
  while [ $i -lt 25 ]; do
    if wget -q -O /dev/null http://127.0.0.1:3005/api/whatsapp/bot-config 2>/dev/null; then
      echo "[Production] WhatsAppQrGateway is ready on 127.0.0.1:3005"
      break
    fi
    sleep 0.2
    i=$((i + 1))
  done
fi

# Execute Nginx foreground process
exec nginx -g "daemon off;"
