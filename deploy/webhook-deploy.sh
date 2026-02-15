#!/bin/bash
# Production deployment webhook
# This script listens for GitHub webhook and deploys automatically

set -euo pipefail

APP_DIR="/root/freela"
LOG_FILE="/root/freela/deploy/webhook.log"
GITHUB_SECRET="${GITHUB_WEBHOOK_SECRET:-}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $@" | tee -a "$LOG_FILE"
}

deploy() {
    log "Starting deployment..."
    
    cd "$APP_DIR"
    
    # Pull latest code
    log "Pulling latest code from main..."
    git fetch origin main
    git reset --hard origin/main
    
    # Restart services
    log "Restarting Docker services..."
    docker-compose -f docker-compose.prod.yml pull
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    sleep 5
    
    # Health check
    log "Running health check..."
    HEALTH_RESPONSE=$(curl -s https://freela.ge/api/health || echo "{\"ok\":false}")
    
    if echo "$HEALTH_RESPONSE" | grep -q '"ok":true'; then
        log "✅ Deployment successful!"
        return 0
    else
        log "❌ Health check failed: $HEALTH_RESPONSE"
        return 1
    fi
}

# If called as webhook handler
if [[ "$REQUEST_METHOD" == "POST" ]]; then
    deploy
    echo '{"status":"success"}'
else
    # Manual deployment
    deploy
fi
