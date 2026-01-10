# Xinote Deployment via DigitalOcean Web Console

Step-by-step guide for deploying Xinote using **only** the DigitalOcean web console (no SSH client needed).

---

## 📋 Prerequisites

- DigitalOcean account with access to your droplet
- OpenAI API key (get from https://platform.openai.com/api-keys)
- Domain pointed to your droplet IP (64.225.76.110)

---

## 🚀 Step-by-Step Deployment

### Step 1: Access Console

1. Go to https://cloud.digitalocean.com/droplets
2. Click your droplet
3. Click **"Access"** tab
4. Click **"Launch Droplet Console"**

A terminal will open in your browser - you'll do everything here!

---

### Step 2: Create Project Files Using GitHub

Since we can't upload files via web console, we'll use a GitHub Gist:

**In the DO Console**, run these commands one by one:

```bash
# Go to opt directory
cd /opt

# Clone your project or create manually
mkdir -p xinote-backend/docker/supabase
cd xinote-backend
```

---

### Step 3: Create Files Directly in Console

I'll give you copy-paste blocks for each file. Copy each block and paste into the console.

#### 3a. Create database schema

```bash
cat > docker/supabase/schema.sql << 'EOFSCHEMA'
```

Then copy-paste the ENTIRE contents of your local `docker/supabase/schema.sql` file (the one with xinote schema).

After pasting, type:
```bash
EOFSCHEMA
```

#### 3b. Create storage setup

```bash
cat > docker/supabase/storage-setup.sql << 'EOFSTORAGE'
```

Copy-paste the ENTIRE contents of `docker/supabase/storage-setup.sql`

Then type:
```bash
EOFSTORAGE
```

#### 3c. Create database setup script

```bash
cat > docker/supabase/setup-database.sh << 'EOFSETUP'
```

Copy-paste the ENTIRE contents of `docker/supabase/setup-database.sh`

Then type:
```bash
EOFSETUP
```

Make it executable:
```bash
chmod +x docker/supabase/setup-database.sh
```

---

### Step 4: Alternative - Use wget/curl

**Even easier:** I can create raw file URLs for you to download directly!

Put all your files in a GitHub repository or Gist, then:

```bash
cd /opt/xinote-backend

# Download schema
wget -O docker/supabase/schema.sql https://raw.githubusercontent.com/YOUR_USERNAME/xinote/main/docker/supabase/schema.sql

# Download storage setup
wget -O docker/supabase/storage-setup.sql https://raw.githubusercontent.com/YOUR_USERNAME/xinote/main/docker/supabase/storage-setup.sql

# Download setup script
wget -O docker/supabase/setup-database.sh https://raw.githubusercontent.com/YOUR_USERNAME/xinote/main/docker/supabase/setup-database.sh

# Make executable
chmod +x docker/supabase/setup-database.sh
```

---

### Step 5: Run Database Setup

```bash
cd /opt/xinote-backend/docker/supabase
./setup-database.sh
```

**Important:** The script will display your Supabase credentials. Copy them - you'll need them next!

Example output:
```
SUPABASE_URL=http://supabase-kong:8000
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

### Step 6: Create .env File

```bash
cd /opt/xinote-backend/docker

# Create .env file
cat > .env << 'EOFENV'
# Supabase (paste values from setup-database.sh output above)
SUPABASE_URL=http://supabase-kong:8000
SUPABASE_ANON_KEY=PASTE_YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_SERVICE_ROLE_KEY_HERE

# OpenAI API
OPENAI_API_KEY=sk-PASTE_YOUR_OPENAI_KEY_HERE

# Security Keys
JWT_SECRET=PASTE_GENERATED_SECRET_HERE
ENCRYPTION_KEY=PASTE_GENERATED_SECRET_HERE
DB_ENCRYPTION_PASSWORD=PASTE_GENERATED_SECRET_HERE

# Domain
DOMAIN=xinote.amega.one
EOFENV
```

**Generate security keys:**
```bash
# Generate 3 random keys
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
echo "DB_ENCRYPTION_PASSWORD=$(openssl rand -base64 32)"
```

Copy the output and edit `.env`:
```bash
nano .env
```

In nano:
- Use arrow keys to navigate
- Paste your keys in the right places
- Press `Ctrl+X`, then `Y`, then `Enter` to save

---

### Step 7: Upload SvelteKit App Files

This is the trickiest part without SCP. You have **3 options**:

#### Option A: Use Git (Best)

If your xinote-admin folder is in a Git repo:

```bash
cd /opt/xinote-backend
git clone https://github.com/YOUR_USERNAME/xinote.git temp
cp -r temp/xinote-admin ./
rm -rf temp
```

#### Option B: Use DigitalOcean Volumes

1. Create a volume in DO dashboard
2. Upload files via SFTP to the volume
3. Mount and copy to /opt/xinote-backend

#### Option C: Rebuild from package.json

If you just need the SvelteKit scaffolding:

```bash
cd /opt/xinote-backend
mkdir xinote-admin
cd xinote-admin

# Create package.json
cat > package.json << 'EOFPKG'
{
  "name": "xinote-admin",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/adapter-vercel": "^5.4.4",
    "@sveltejs/kit": "^2.8.1",
    "@sveltejs/vite-plugin-svelte": "^3.1.2",
    "svelte": "^4.2.19",
    "svelte-check": "^4.0.6",
    "typescript": "^5.6.3",
    "vite": "^5.4.10"
  },
  "dependencies": {
    "@tailwindcss/forms": "^0.5.9",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15"
  },
  "type": "module"
}
EOFPKG

# Install dependencies
npm install

# Create basic SvelteKit structure (you'll need to add your source files manually)
```

---

### Step 8: Create Remaining Docker Files

```bash
cd /opt/xinote-backend/docker

# Docker Compose
cat > docker-compose.yml << 'EOFCOMPOSE'
version: '3.8'

services:
  xinote-backend:
    build:
      context: ../xinote-admin
      dockerfile: ../docker/Dockerfile
    container_name: xinote-backend
    restart: unless-stopped
    env_file:
      - .env
    environment:
      NODE_ENV: production
      PORT: 3000
    volumes:
      - xinote_uploads:/app/uploads
      - xinote_logs:/app/logs
    networks:
      - xinote_network
      - supabase_default
    ports:
      - "3001:3000"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  xinote_network:
    driver: bridge
  supabase_default:
    external: true

volumes:
  xinote_uploads:
  xinote_logs:
EOFCOMPOSE
```

---

### Step 9: Create Deployment Script

```bash
cat > deploy.sh << 'EOFDEPLOY'
#!/bin/bash
set -e

echo "🚀 Deploying Xinote Backend..."

cd /opt/xinote-backend/docker

# Check .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Build and start
docker compose build
docker compose up -d

# Wait for health check
echo "⏳ Waiting for backend to be healthy..."
sleep 15

# Show status
docker compose ps

echo "✅ Deployment complete!"
echo "Test: curl http://localhost:3001/api/health"
EOFDEPLOY

chmod +x deploy.sh
```

---

### Step 10: Deploy!

```bash
cd /opt/xinote-backend/docker
./deploy.sh
```

---

### Step 11: Update Caddy

```bash
# Backup Caddy config
cp /opt/n8n-docker-caddy/Caddyfile /opt/n8n-docker-caddy/Caddyfile.backup

# Add Xinote config
cat >> /opt/n8n-docker-caddy/Caddyfile << 'EOFCADDY'

xinote.amega.one {
    reverse_proxy xinote-backend:3000
}
EOFCADDY

# Reload Caddy
docker exec n8n-docker-caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

---

### Step 12: Verify

```bash
# Check container
docker ps | grep xinote

# Check logs
docker logs xinote-backend

# Test locally
curl http://localhost:3001/api/health

# Test via domain (after DNS)
curl https://xinote.amega.one/api/health
```

---

## 🎯 Quick Reference - All Commands

For easy copy-paste, here's the complete sequence (after files are created):

```bash
# 1. Database setup
cd /opt/xinote-backend/docker/supabase
./setup-database.sh

# 2. Configure .env (edit manually)
cd /opt/xinote-backend/docker
nano .env

# 3. Deploy
./deploy.sh

# 4. Update Caddy
cat >> /opt/n8n-docker-caddy/Caddyfile << 'EOF'
xinote.amega.one {
    reverse_proxy xinote-backend:3000
}
EOF
docker exec n8n-docker-caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile

# 5. Test
curl http://localhost:3001/api/health
```

---

## 💡 Tips for Web Console

1. **Copy-paste long files**: Use the heredoc method (cat > file << 'EOF')
2. **Check files**: Use `cat filename` to verify contents
3. **Edit files**: Use `nano filename` (Ctrl+X to exit)
4. **View logs**: Use `docker logs -f xinote-backend`
5. **Session timeout**: Console may disconnect - just reconnect and continue

---

## 🆘 Need Help?

If you get stuck, the easiest solution is to:

1. Push your local xinote project to GitHub
2. Clone it on the server:
   ```bash
   cd /opt
   git clone https://github.com/YOUR_USERNAME/xinote.git xinote-backend
   ```

This way all files are already there!
