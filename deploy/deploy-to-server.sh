#!/bin/bash

# Deployment script for freela.ge server
# Usage: ./deploy-to-server.sh [--host <host>] [--user <user>] [--key <key-path>] [--health-token <token>]

set -e

# Default values
HOST="76.13.144.121"
USER="root"
KEY_PATH=""
HEALTH_TOKEN=""
PORT=22
HEALTH_URL="https://freela.ge/api/health"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --host)
      HOST="$2"
      shift 2
      ;;
    --user)
      USER="$2"
      shift 2
      ;;
    --key)
      KEY_PATH="$2"
      shift 2
      ;;
    --health-token)
      HEALTH_TOKEN="$2"
      shift 2
      ;;
    --health-url)
      HEALTH_URL="$2"
      shift 2
      ;;
    --port)
      PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--host <host>] [--user <user>] [--key <key-path>] [--health-token <token>] [--health-url <url>] [--port <port>]"
      exit 1
      ;;
  esac
done

echo -e "${YELLOW}[deploy] Starting deployment to ${USER}@${HOST}:${PORT}${NC}"

# Build SSH command
SSH_CMD="ssh"
if [ -n "$KEY_PATH" ]; then
  echo -e "${YELLOW}[deploy] Using SSH key: $KEY_PATH${NC}"
  SSH_CMD="$SSH_CMD -i $KEY_PATH"
fi
SSH_CMD="$SSH_CMD -p $PORT -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"

# Test SSH connection
echo -e "${YELLOW}[deploy] Testing SSH connection...${NC}"
if ! $SSH_CMD ${USER}@${HOST} "echo 'SSH connection OK'" > /dev/null 2>&1; then
  echo -e "${RED}[deploy] ❌ SSH connection failed${NC}"
  echo -e "${RED}[deploy] Please ensure:${NC}"
  echo -e "${RED}  1. SSH key is configured (use --key flag or add to ~/.ssh)${NC}"
  echo -e "${RED}  2. Host is reachable at ${HOST}:${PORT}${NC}"
  echo -e "${RED}  3. User ${USER} can login${NC}"
  exit 1
fi
echo -e "${GREEN}[deploy] ✓ SSH connection OK${NC}"

# Check if directory exists
echo -e "${YELLOW}[deploy] Checking project directory...${NC}"
if ! $SSH_CMD ${USER}@${HOST} "test -d ~/freela" > /dev/null 2>&1; then
  echo -e "${RED}[deploy] ❌ Directory ~/freela not found on server${NC}"
  exit 1
fi
echo -e "${GREEN}[deploy] ✓ Project directory exists${NC}"

# Run deployment
echo -e "${YELLOW}[deploy] Running update script...${NC}"

DEPLOY_CMD="cd ~/freela"

if [ -n "$HEALTH_TOKEN" ]; then
  DEPLOY_CMD="$DEPLOY_CMD && HEALTH_CHECK_TOKEN='$HEALTH_TOKEN' ./deploy/update-host.sh --health-url '$HEALTH_URL'"
else
  DEPLOY_CMD="$DEPLOY_CMD && ./deploy/update-host.sh --health-url '$HEALTH_URL'"
fi

if $SSH_CMD ${USER}@${HOST} "$DEPLOY_CMD"; then
  echo -e "${GREEN}[deploy] ✓ Deployment completed${NC}"
  
  # Verify health check
  echo -e "${YELLOW}[deploy] Verifying health endpoint...${NC}"
  if [ -n "$HEALTH_TOKEN" ]; then
    HEALTH_RESPONSE=$(curl -s -H "x-health-secret: $HEALTH_TOKEN" "$HEALTH_URL" || echo "")
  else
    HEALTH_RESPONSE=$(curl -s "$HEALTH_URL" || echo "")
  fi
  
  if echo "$HEALTH_RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}[deploy] ✓ Health check passed${NC}"
    echo -e "${GREEN}[deploy] 🎉 Deployment successful!${NC}"
    exit 0
  else
    echo -e "${YELLOW}[deploy] ⚠ Health check response: $HEALTH_RESPONSE${NC}"
    echo -e "${YELLOW}[deploy] (This may be normal if the server is still starting up)${NC}"
    exit 0
  fi
else
  echo -e "${RED}[deploy] ❌ Deployment script failed${NC}"
  exit 1
fi
