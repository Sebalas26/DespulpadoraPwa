# ==========================================
# Etapa 1: Build de la aplicación Angular PWA
# ==========================================
# @angular/cli 20.3.37 requiere Node ^20.19.0 || ^22.12.0 || >=24.0.0
FROM node:22-alpine AS build

WORKDIR /app

# Copiar manifiestos de dependencias primero para aprovechar la caché de capas de Docker
COPY package.json package-lock.json ./

# Instalación limpia y determinista de dependencias
RUN npm ci

# Copiar el resto del código fuente del proyecto
COPY . .

# Compilar en modo producción (por defecto en angular.json -> defaultConfiguration: "production")
# El builder @angular/build:application genera la salida en dist/despulpadora-pwa/browser
RUN npm run build

# ==========================================
# Etapa 2: Servidor de producción con Nginx + WhatsAppQrGateway
# ==========================================
FROM nginx:alpine AS production

# Instalar Node.js, npm y git en Alpine para instalar y ejecutar WhatsAppQrGateway en segundo plano
RUN apk add --no-cache nodejs npm git

WORKDIR /app

# Eliminar configuración por defecto e inyectar nuestra configuración optimizada para SPA/PWA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar y desplegar microservicio WhatsAppQrGateway
COPY whatsapp-gateway /app/whatsapp-gateway
RUN cd /app/whatsapp-gateway && npm install --omit=dev

# Limpiar archivos estáticos por defecto de Nginx y copiar el build de Angular
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/despulpadora-pwa/browser /usr/share/nginx/html

# Copiar y configurar entrypoint de producción (sanitizando posibles saltos de línea CRLF de Windows)
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
