#!/bin/bash

#####################################################
# Xinote Backend Deployment Script
# Server: 64.225.76.110
# Target: /opt/xinote-backend
#####################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Xinote Backend Deployment${NC}"
echo "================================"

# Configuration
DEPLOY_DIR="/opt/xinote-backend"
PROJECT_NAME="xinote"
BACKUP_DIR="/opt/backups/xinote"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root or with sudo${NC}"
    exit 1
fi

# Step 1: Create deployment directory
echo -e "\n${YELLOW}📁 Creating deployment directory...${NC}"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Step 2: Check if .env exists
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo -e "Please create ${DEPLOY_DIR}/.env with required configuration"
    echo -e "You can use .env.example as a template"
    exit 1
fi

# Step 3: Pull latest code (if git repo)
if [ -d ".git" ]; then
    echo -e "\n${YELLOW}🔄 Pulling latest changes...${NC}"
    git pull
else
    echo -e "\n${YELLOW}⚠️  Not a git repository. Make sure files are up to date.${NC}"
fi

# Step 4: Check Docker network exists
echo -e "\n${YELLOW}🔌 Checking Docker networks...${NC}"
if ! docker network ls | grep -q "supabase_default"; then
    echo -e "${RED}❌ Supabase network not found!${NC}"
    echo -e "Please ensure Supabase is running at /opt/supabase-project"
    exit 1
fi

# Step 5: Build and start containers
echo -e "\n${YELLOW}🐳 Building Docker image...${NC}"
docker compose build --no-cache

echo -e "\n${YELLOW}🚀 Starting containers...${NC}"
docker compose up -d

# Step 6: Wait for health check
echo -e "\n${YELLOW}⏳ Waiting for backend to be healthy...${NC}"
sleep 10

MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker compose ps | grep -q "healthy"; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    fi

    ATTEMPT=$((ATTEMPT+1))
    echo -e "Waiting... (${ATTEMPT}/${MAX_ATTEMPTS})"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ Backend failed to become healthy${NC}"
    echo -e "Check logs with: docker compose logs -f"
    exit 1
fi

# Step 7: Show status
echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo "================================"
docker compose ps

# Step 8: Show useful commands
echo -e "\n${YELLOW}📝 Useful commands:${NC}"
echo "  View logs:     docker compose logs -f"
echo "  Restart:       docker compose restart"
echo "  Stop:          docker compose down"
echo "  Update:        ./deploy.sh"
echo "  Shell access:  docker compose exec xinote-backend sh"

# Step 9: Test endpoint
echo -e "\n${YELLOW}🧪 Testing health endpoint...${NC}"
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed${NC}"
fi

echo -e "\n${GREEN}🎉 Xinote backend is now running!${NC}"
echo -e "Access it at: https://xinote.amega.one"
