#!/bin/bash
# Quick Deploy Script for Linux/VPS
# Usage: ./deploy/quick-deploy.sh "Your commit message"

set -euo pipefail

COMMIT_MESSAGE="${1:-chore: update application}"
APP_DIR="${APP_DIR:-~/freela}"
HEALTH_URL="https://freela.ge/api/health"
LOG_FILE="${APP_DIR}/deploy/deploy.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${YELLOW}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

header() {
    echo -e "\n${CYAN}=== $1 ===${NC}\n"
}

# Check prerequisites
header "Checking Prerequisites"
command -v git >/dev/null 2>&1 || error "git is not installed"
command -v docker >/dev/null 2>&1 || error "docker is not installed"
command -v docker-compose >/dev/null 2>&1 || error "docker-compose is not installed"
success "All prerequisites found"

# Navigate to app directory
cd "$APP_DIR" || error "Cannot cd to $APP_DIR"
log "Working directory: $APP_DIR"

# Check for local changes
header "Checking Git Status"
if git diff-index --quiet HEAD --; then
    info "No local changes detected"
    exit 0
fi
success "Found local changes"
git status --short | sed 's/^/  /'

# Commit changes
header "Committing Changes"
log "Committing: $COMMIT_MESSAGE"
git add -A
git commit -m "$COMMIT_MESSAGE" || info "Nothing new to commit"
COMMIT_HASH=$(git rev-parse --short HEAD)
success "Committed: $COMMIT_HASH"

# Push changes
header "Pushing to Remote"
log "Pushing to origin/main..."
if git push origin main; then
    success "Changes pushed to GitHub"
else
    error "Failed to push changes"
fi

# Pull latest locally and rebuild
header "Pulling Latest Code"
git pull origin main
success "Latest code pulled"

# Rebuild Docker images
header "Building Docker Images"
log "Building with docker-compose..."
if docker-compose -f docker-compose.prod.yml build; then
    success "Docker build completed"
else
    error "Docker build failed"
fi

# Deploy (restart containers)
header "Deploying Services"
log "Starting containers..."
if docker-compose -f docker-compose.prod.yml up -d; then
    success "Containers started"
else
    error "Failed to start containers"
fi

# Wait for services to be ready
log "Waiting for services to stabilize..."
sleep 5

# Health check
header "Health Check"
log "Checking $HEALTH_URL"
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        HEALTH=$(curl -s "$HEALTH_URL")
        success "Server healthy: $HEALTH"
        break
    fi
    
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        error "Health check failed after $MAX_ATTEMPTS attempts (HTTP $HTTP_CODE)"
    fi
    
    echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS failed (HTTP $HTTP_CODE), retrying..."
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

# Show summary
header "Deployment Complete"
echo "Commit:  $COMMIT_HASH"
echo "Branch:  main"
echo "Site:    https://freela.ge"
echo "Health:  $HEALTH_URL"
echo ""
success "✅ Deployment successful!"
