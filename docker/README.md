# Xinote Backend Docker Deployment

Complete Docker setup for deploying Xinote backend to your server at `64.225.76.110`.

## 📋 Prerequisites

- Docker & Docker Compose v2 installed ✅
- Existing Supabase instance running ✅
- Caddy reverse proxy ✅
- Domain pointing to server (xinote.amega.one)

## 🚀 Quick Start

### 1. Prepare Your Server

SSH into your server:
```bash
ssh root@64.225.76.110
```

Create deployment directory:
```bash
mkdir -p /opt/xinote-backend
cd /opt/xinote-backend
```

### 2. Upload Files

From your local machine, upload the necessary files:

```bash
# From the xinote project root directory
scp -r docker/* root@64.225.76.110:/opt/xinote-backend/
scp -r xinote-admin root@64.225.76.110:/opt/xinote-backend/
```

### 3. Configure Environment

On the server:
```bash
cd /opt/xinote-backend
cp .env.example .env
nano .env  # Edit with your actual values
```

**Required environment variables:**
- `SUPABASE_URL` - Get from your Supabase dashboard
- `SUPABASE_ANON_KEY` - From Supabase settings
- `SUPABASE_SERVICE_ROLE_KEY` - From Supabase settings
- `OPENAI_API_KEY` - From https://platform.openai.com/api-keys
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `ENCRYPTION_KEY` - Generate with: `openssl rand -base64 32`

### 4. Get Supabase Credentials

Your Supabase is running at `/opt/supabase-project`. Get the credentials:

```bash
cd /opt/supabase-project
cat .env | grep -E "ANON_KEY|SERVICE_ROLE_KEY|SUPABASE_URL"
```

Or access Supabase Studio:
```
http://64.225.76.110:8000
```

### 5. Deploy

Make the deployment script executable and run it:
```bash
chmod +x deploy.sh
./deploy.sh
```

### 6. Update Caddy Configuration

Add the Xinote configuration to your existing Caddy setup:

```bash
# Backup current Caddyfile
cp /opt/n8n-docker-caddy/Caddyfile /opt/n8n-docker-caddy/Caddyfile.backup

# Add Xinote configuration
cat Caddyfile >> /opt/n8n-docker-caddy/Caddyfile

# Reload Caddy
docker exec n8n-docker-caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│  Internet (HTTPS)                        │
└───────────────┬──────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  Caddy Reverse Proxy                      │
│  (n8n-docker-caddy-caddy-1)              │
│  - Automatic HTTPS/SSL                    │
│  - Port 80/443                            │
└───────────┬───────────────────────────────┘
            │
            ├─► n8n.amega.one → n8n container
            └─► xinote.amega.one → xinote-backend
                                    │
                ┌───────────────────┴──────────┐
                ▼                              ▼
        ┌──────────────┐            ┌──────────────────┐
        │ Xinote       │            │ Supabase Stack   │
        │ Backend      │──────────► │ (existing)       │
        │ Container    │            │ - PostgreSQL     │
        │              │            │ - Auth           │
        │ Port: 3001   │            │ - Storage        │
        └──────────────┘            │ - Realtime       │
                │                   └──────────────────┘
                │
                ▼
        ┌──────────────┐
        │ OpenAI API   │
        │ (Whisper)    │
        └──────────────┘
```

## 📁 Directory Structure

```
/opt/xinote-backend/
├── docker-compose.yml       # Main Docker Compose configuration
├── Dockerfile              # Multi-stage build for SvelteKit
├── .env                    # Environment variables (create from .env.example)
├── .env.example           # Template for environment variables
├── Caddyfile              # Caddy reverse proxy config
├── deploy.sh              # Deployment automation script
├── README.md              # This file
└── xinote-admin/          # SvelteKit application code
    ├── src/
    ├── static/
    ├── package.json
    └── svelte.config.js
```

## 🔧 Management Commands

```bash
# View logs
docker compose logs -f xinote-backend

# Restart service
docker compose restart

# Stop service
docker compose down

# Update and redeploy
./deploy.sh

# Enter container shell
docker compose exec xinote-backend sh

# Check health
curl http://localhost:3001/api/health

# View resource usage
docker stats xinote-backend
```

## 🔍 Troubleshooting

### Container won't start
```bash
docker compose logs -f
docker compose ps
```

### Can't connect to Supabase
```bash
# Verify Supabase is running
docker ps | grep supabase

# Check network connectivity
docker compose exec xinote-backend ping supabase-kong
```

### Health check failing
```bash
# Check if app is running
docker compose exec xinote-backend wget -O- http://localhost:3000/api/health

# Check Node.js process
docker compose exec xinote-backend ps aux
```

### Caddy not routing traffic
```bash
# Check Caddy logs
docker logs n8n-docker-caddy-caddy-1

# Reload Caddy config
docker exec n8n-docker-caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile

# Verify DNS resolution
dig xinote.amega.one
```

## 🔐 Security Checklist

- [ ] `.env` file is not committed to git
- [ ] Strong JWT_SECRET generated (min 32 chars)
- [ ] Strong ENCRYPTION_KEY generated (min 32 chars)
- [ ] Supabase Row Level Security (RLS) policies enabled
- [ ] API rate limiting configured
- [ ] HTTPS only (enforced by Caddy)
- [ ] Regular backups scheduled
- [ ] Audit logging enabled

## 📊 Monitoring

### Check Service Health
```bash
curl https://xinote.amega.one/api/health
```

### Resource Usage
```bash
docker stats xinote-backend
```

### Disk Space
```bash
docker system df
df -h /opt/xinote-backend
```

### Logs
```bash
# Last 100 lines
docker compose logs --tail=100 xinote-backend

# Follow logs
docker compose logs -f xinote-backend

# Logs since 1 hour ago
docker compose logs --since 1h xinote-backend
```

## 🔄 Updates & Maintenance

### Update Application
```bash
cd /opt/xinote-backend
git pull  # If using git
./deploy.sh
```

### Backup Data
```bash
# Backup volumes
docker run --rm \
  -v xinote_uploads:/data \
  -v /opt/backups/xinote:/backup \
  alpine tar czf /backup/xinote-uploads-$(date +%Y%m%d).tar.gz /data

# Backup database (via Supabase)
cd /opt/supabase-project
# Use Supabase backup commands
```

### Cleanup Old Images
```bash
docker image prune -a
docker volume prune
```

## 🌐 DNS Configuration

Point your domain to the server:

```
Type: A Record
Host: xinote.amega.one
Value: 64.225.76.110
TTL: 300
```

## 📞 Support

If you encounter issues:
1. Check logs: `docker compose logs -f`
2. Verify configuration: `docker compose config`
3. Check container health: `docker compose ps`
4. Review environment variables: `cat .env`

## 🎯 Next Steps

After deployment:
1. ✅ Set up Supabase database schema
2. ✅ Configure Row Level Security policies
3. ✅ Test API endpoints
4. ✅ Update Flutter app to use new backend
5. ✅ Migrate existing n8n data (if any)
