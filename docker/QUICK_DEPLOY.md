# Quick Deployment Guide

This guide helps you deploy Xinote backend from the **project root** (which includes the Flutter app).

## Project Structure

```
/opt/xinote/                    # Project root
├── android/                    # Flutter Android app
├── lib/                        # Flutter app code
├── xinote-admin/              # SvelteKit admin dashboard (deployed)
├── xinote-backend/            # Backend API code (if separate)
└── docker/                    # Docker deployment config
    ├── docker-compose.yml
    ├── Dockerfile
    ├── deploy.sh
    ├── .env.example
    └── supabase/
        ├── schema.sql
        ├── storage-setup.sql
        └── setup-database.sh
```

## Deployment Steps (DigitalOcean Web Console)

### 1. Clone Repository

```bash
cd /opt
git clone https://github.com/amegabosco/xinote.git
cd xinote
```

### 2. Set Up Database

```bash
cd docker/supabase
./setup-database.sh
```

**Copy the Supabase credentials shown** - you'll need them next!

### 3. Configure Environment

```bash
cd ../  # Back to docker/ directory
cp .env.example .env
nano .env
```

Fill in:
- `SUPABASE_URL` - from setup-database.sh output
- `SUPABASE_ANON_KEY` - from setup-database.sh output
- `SUPABASE_SERVICE_ROLE_KEY` - from setup-database.sh output
- `OPENAI_API_KEY` - your OpenAI API key (sk-...)
- Generate secrets:
  ```bash
  openssl rand -base64 32  # For JWT_SECRET
  openssl rand -base64 32  # For ENCRYPTION_KEY
  openssl rand -base64 32  # For DB_ENCRYPTION_PASSWORD
  ```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### 4. Deploy Backend

```bash
./deploy.sh
```

### 5. Update Caddy (for HTTPS)

```bash
# Backup current config
cp /opt/n8n-docker-caddy/Caddyfile /opt/n8n-docker-caddy/Caddyfile.backup

# Add Xinote config
cat >> /opt/n8n-docker-caddy/Caddyfile << 'EOF'

xinote.amega.one {
    reverse_proxy localhost:3001
}
EOF

# Reload Caddy
docker exec n8n-docker-caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

### 6. Verify

```bash
# Check container
docker ps | grep xinote

# Test locally
curl http://localhost:3001/api/health

# Test via domain (after DNS)
curl https://xinote.amega.one/api/health
```

## Important Notes

- **Working from project root**: The deployment works from `/opt/xinote` (full project), not `/opt/xinote-backend`
- **Docker context**: Build context is `../xinote-admin` from docker/ directory
- **Port**: Backend runs on port 3001 (mapped from internal 3000)
- **Network**: Connects to existing Supabase via `supabase_default` network
- **Schema**: All database tables are in isolated `xinote` schema

## Useful Commands

All commands assume you're in `/opt/xinote/docker/`:

```bash
cd /opt/xinote/docker

# View logs
docker compose logs -f

# Restart backend
docker compose restart

# Stop backend
docker compose down

# Rebuild and deploy
./deploy.sh

# Shell access
docker compose exec xinote-backend sh

# View database tables
docker exec supabase-db psql -U postgres -d postgres -c '\dt xinote.*'
```

## Troubleshooting

### Container won't start
```bash
cd /opt/xinote/docker
docker compose logs -f xinote-backend
```

### Health check failing
```bash
# Check if port 3001 is accessible
curl http://localhost:3001/api/health

# Check environment variables
docker compose exec xinote-backend env | grep SUPABASE
```

### Database connection issues
```bash
# Verify xinote schema exists
docker exec supabase-db psql -U postgres -d postgres -c '\dn'

# Check if tables were created
docker exec supabase-db psql -U postgres -d postgres -c '\dt xinote.*'
```

### Caddy not routing traffic
```bash
# Verify Caddy config
docker exec n8n-docker-caddy-caddy-1 caddy validate --config /etc/caddy/Caddyfile

# Check Caddy logs
docker logs n8n-docker-caddy-caddy-1 --tail 50
```

## Rollback

If something goes wrong:

```bash
# Stop container
cd /opt/xinote/docker
docker compose down

# Remove volumes
docker volume rm xinote_uploads xinote_logs

# Restore Caddyfile
cp /opt/n8n-docker-caddy/Caddyfile.backup /opt/n8n-docker-caddy/Caddyfile
docker exec n8n-docker-caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile

# Remove database schema (if needed)
docker exec supabase-db psql -U postgres -d postgres -c "DROP SCHEMA xinote CASCADE;"
```

## Next Steps

After successful deployment:

1. Update Flutter app to use new backend URL
2. Test audio upload from mobile app
3. Verify transcription workflow
4. Set up monitoring and backups
5. Configure DNS for xinote.amega.one
