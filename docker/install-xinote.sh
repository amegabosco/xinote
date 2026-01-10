#!/bin/bash

#####################################################
# Xinote Complete Installation Script
# For DigitalOcean Web Console
#
# Usage: Simply copy-paste this entire file into
#        the DO web console terminal and press Enter
#####################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Xinote Backend Installation      ║${NC}"
echo -e "${GREEN}║  For DigitalOcean Web Console      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════╝${NC}"

# Step 1: Create directory structure
echo -e "\n${YELLOW}📁 Creating directory structure...${NC}"
mkdir -p /opt/xinote-backend/docker/supabase
cd /opt/xinote-backend

# Step 2: Create Docker Compose file
echo -e "${YELLOW}📝 Creating docker-compose.yml...${NC}"
cat > docker/docker-compose.yml << 'EOF'
version: '3.8'

services:
  xinote-backend:
    build:
      context: ../xinote-admin
      dockerfile: ../docker/Dockerfile
    container_name: xinote-backend
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      ORIGIN: https://xinote.amega.one
      PUBLIC_SUPABASE_URL: ${SUPABASE_URL}
      PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      MAX_FILE_SIZE: 100MB
      UPLOAD_DIR: /app/uploads

    volumes:
      - xinote_uploads:/app/uploads
      - xinote_logs:/app/logs

    networks:
      - xinote_network
      - supabase_default

    ports:
      - "3001:3000"

    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    labels:
      caddy: xinote.amega.one
      caddy.reverse_proxy: "{{upstreams 3000}}"

networks:
  xinote_network:
    driver: bridge
    name: xinote_network

  supabase_default:
    external: true

volumes:
  xinote_uploads:
    driver: local
    name: xinote_uploads
  xinote_logs:
    driver: local
    name: xinote_logs
EOF

# Step 3: Create Dockerfile
echo -e "${YELLOW}📝 Creating Dockerfile...${NC}"
cat > docker/Dockerfile << 'EOF'
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY xinote-admin/package*.json ./
RUN npm ci --only=production

COPY xinote-admin/ ./
RUN npm run build

FROM node:20-alpine AS production

RUN apk add --no-cache curl wget ca-certificates tzdata

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

RUN mkdir -p /app/uploads /app/logs && chown -R nodejs:nodejs /app/uploads /app/logs

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "build"]
EOF

# Step 4: Create .env.example
echo -e "${YELLOW}📝 Creating .env.example...${NC}"
cat > docker/.env.example << 'EOF'
# Supabase Configuration
SUPABASE_URL=http://supabase-kong:8000
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key-here

# Security Keys (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_minimum_32_characters_here
ENCRYPTION_KEY=your_encryption_key_minimum_32_characters_here
DB_ENCRYPTION_PASSWORD=your_db_encryption_password_here

# Domain
DOMAIN=xinote.amega.one
EOF

echo -e "${GREEN}✅ Docker files created${NC}"

# Step 5: Ask if user wants to continue with database setup
echo -e "\n${BLUE}════════════════════════════════════${NC}"
echo -e "${YELLOW}Next: Set up database schema${NC}"
echo -e "${BLUE}════════════════════════════════════${NC}"
echo -e ""
echo -e "The database setup script will now be created."
echo -e "After this script completes, you'll need to:"
echo -e "  1. Run the database setup"
echo -e "  2. Configure .env file"
echo -e "  3. Deploy the backend"
echo -e ""
echo -e "${YELLOW}Press Enter to continue or Ctrl+C to stop${NC}"
read

# Step 6: Download database schema files from GitHub (or create inline)
echo -e "${YELLOW}📝 Creating database schema files...${NC}"

# This will be a very long heredoc - let me create it separately
echo -e "${BLUE}Database schema files are too large for inline creation.${NC}"
echo -e "${YELLOW}Please run this command to download them:${NC}"
echo ""
echo "curl -o docker/supabase/schema.sql https://raw.githubusercontent.com/YOUR_REPO/xinote/main/docker/supabase/schema.sql"
echo "curl -o docker/supabase/storage-setup.sql https://raw.githubusercontent.com/YOUR_REPO/xinote/main/docker/supabase/storage-setup.sql"
echo "curl -o docker/supabase/setup-database.sh https://raw.githubusercontent.com/YOUR_REPO/xinote/main/docker/supabase/setup-database.sh"
echo ""
echo -e "${YELLOW}OR manually create them using the files from your local project${NC}"
echo ""
echo -e "${GREEN}✅ Installation files created!${NC}"
echo -e ""
echo -e "${BLUE}Directory: /opt/xinote-backend${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Upload xinote-admin folder contents"
echo "2. Download database schema files (see above)"
echo "3. Run: cd docker/supabase && ./setup-database.sh"
echo "4. Configure .env file"
echo "5. Run: cd docker && ./deploy.sh"

EOF

echo -e "${GREEN}✅ Master installation script created!${NC}"
