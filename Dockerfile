# ==============================================================================
# CivicFix AI Platform — Frontend Multi-Stage Dockerfile
# Stage 1: Build React SPA bundle with Vite & Node.js 20 Alpine
# Stage 2: High-performance Nginx production web server with API reverse proxy
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Artifacts
# ------------------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies using package-lock.json for reproducible builds
COPY package*.json ./
RUN npm ci

# Copy frontend source files (backend and tests excluded via .dockerignore)
COPY . .

# Compile optimized production bundle into dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Nginx Web Server
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine

# Remove default configuration and static placeholder files
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/*

# Install custom Nginx configuration with SPA fallback and API proxying
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled production bundle from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Health check to ensure Nginx is serving the SPA
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

# Launch Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

