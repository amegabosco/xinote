#!/bin/bash

# Script de redéploiement rapide Xinote
# Usage: ./redeploy.sh

set -e  # Exit on error

echo "🚀 Starting Xinote redeployment..."
echo ""

# Step 1: Pull latest code
echo "📥 Pulling latest code..."
cd /opt/xinote
git pull origin main
echo "✅ Code pulled"
echo ""

# Step 2: Navigate to docker directory
echo "📂 Moving to docker directory..."
cd /opt/xinote/docker

# Step 3: Stop containers
echo "🛑 Stopping containers..."
docker-compose down

# Step 4: Rebuild
echo "🔨 Building containers..."
docker-compose build

# Step 5: Start containers
echo "🚀 Starting containers..."
docker-compose up -d

# Step 6: Show logs
echo ""
echo "📋 Showing last 50 lines of logs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose logs --tail=50 -f
