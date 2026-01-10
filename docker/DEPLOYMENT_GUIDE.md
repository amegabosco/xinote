# Xinote Backend Deployment Guide

Complete step-by-step guide to deploy the Xinote backend replacing n8n.

## 📋 Overview

**What we're deploying:**
- SvelteKit backend with API endpoints
- Supabase PostgreSQL database (using existing instance)
- OpenAI Whisper transcription
- Caddy reverse proxy (using existing instance)
- Docker containerized deployment

**Server:** 64.225.76.110
**Domain:** xinote.amega.one (configure DNS first)
**Schema:** `xinote` (separate from other apps)

---

## 🚀 Deployment Steps

### Step 1: Upload Files to Server

From your local machine (in the xinote project directory):

```bash
# Create deployment directory on server
ssh root@64.225.76.110 "mkdir -p /opt/xinote-backend"

# Upload all necessary files
scp -r docker root@64.225.76.110:/opt/xinote-backend/
scp -r xinote-admin root@64.225.76.110:/opt/xinote-backend/
```

### Step 2: Configure DNS

Point your domain to the server:

```
Type: A Record
Host: xinote.amega.one
Value: 64.225.76.110
TTL: 300
```

Verify DNS propagation:
```bash
dig xinote.amega.one
```

### Step 3: Set Up Database

SSH into your server:
```bash
ssh root@64.225.76.110
cd /opt/xinote-backend/docker/supabase
```

Make the setup script executable and run it:
```bash
chmod +x setup-database.sh
./setup-database.sh
```

This will:
- ✅ Create `xinote` schema in your existing Supabase
- ✅ Create all tables (doctors, patients, recordings, transcriptions, audit_log, api_keys)
- ✅ Set up Row Level Security policies
- ✅ Configure storage bucket
- ✅ Display Supabase credentials

**Save the credentials shown - you'll need them next!**

### Step 4: Configure Environment Variables

Create `.env` file in `/opt/xinote-backend/docker/`:

```bash
cd /opt/xinote-backend/docker
cp .env.example .env
nano .env
```

Fill in these values (from database setup script output):

```bash
# Supabase (from setup-database.sh output)
SUPABASE_URL=http://supabase-kong:8000
SUPABASE_ANON_KEY=your_anon_key_from_setup_script
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_setup_script

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Security (generate with: openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
DB_ENCRYPTION_PASSWORD=$(openssl rand -base64 32)

# Domain
DOMAIN=xinote.amega.one
```

### Step 5: Update Caddy Configuration

Add Xinote to your existing Caddy setup:

```bash
# Backup current config
cp /opt/n8n-docker-caddy/Caddyfile /opt/n8n-docker-caddy/Caddyfile.backup

# Add Xinote configuration
cat /opt/xinote-backend/docker/Caddyfile >> /opt/n8n-docker-caddy/Caddyfile

# Reload Caddy
docker exec n8n-docker-caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

### Step 6: Deploy Backend

Run the deployment script:

```bash
cd /opt/xinote-backend/docker
chmod +x deploy.sh
./deploy.sh
```

This will:
- ✅ Build the Docker image
- ✅ Start the container
- ✅ Wait for health check
- ✅ Verify deployment

### Step 7: Verify Deployment

Check if everything is running:

```bash
# View containers
docker ps | grep xinote

# Check logs
docker compose -f /opt/xinote-backend/docker/docker-compose.yml logs -f

# Test health endpoint
curl http://localhost:3001/api/health

# Test via domain (after DNS propagates)
curl https://xinote.amega.one/api/health
```

---

## 🔧 Post-Deployment Configuration

### Create API Key for Flutter App

Connect to database:
```bash
docker exec -it supabase-db psql -U postgres -d postgres
```

Generate API key for a doctor:
```sql
-- First, create or get doctor ID
INSERT INTO xinote.doctors (email, full_name, structure)
VALUES ('your.email@example.com', 'Your Name', 'Your Clinic')
ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
RETURNING id;

-- Copy the ID and create API key
INSERT INTO xinote.api_keys (
    doctor_id,
    key_hash,
    key_prefix,
    name,
    scopes
) VALUES (
    'doctor-id-from-above',
    crypt('your-secret-api-key', gen_salt('bf')),  -- Hash the key
    'xin_prod_',
    'Flutter Mobile App',
    ARRAY['upload', 'transcribe', 'view']
);
```

Save `your-secret-api-key` - this goes in your Flutter app!

### Test API Endpoints

```bash
# Test with API key
API_KEY="your-secret-api-key"

# Health check
curl https://xinote.amega.one/api/health

# Test authentication
curl -H "Authorization: Bearer $API_KEY" \
     https://xinote.amega.one/api/doctor/profile
```

---

## 📁 Directory Structure on Server

```
/opt/xinote-backend/
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── .env (your secrets - DO NOT COMMIT)
│   ├── .env.example
│   ├── deploy.sh
│   ├── Caddyfile
│   └── supabase/
│       ├── schema.sql
│       ├── storage-setup.sql
│       └── setup-database.sh
└── xinote-admin/ (SvelteKit app code)
    ├── src/
    ├── static/
    ├── package.json
    └── svelte.config.js
```

---

## 🔍 Troubleshooting

### Container won't start

```bash
docker compose -f /opt/xinote-backend/docker/docker-compose.yml logs -f
docker compose -f /opt/xinote-backend/docker/docker-compose.yml ps
```

### Can't connect to Supabase

```bash
# Check Supabase is running
docker ps | grep supabase

# Test connection from xinote container
docker exec xinote-backend ping supabase-kong
```

### Caddy not routing

```bash
# Check Caddy logs
docker logs n8n-docker-caddy-caddy-1

# Verify config syntax
docker exec n8n-docker-caddy-caddy-1 caddy validate --config /etc/caddy/Caddyfile
```

### Database connection issues

```bash
# Verify xinote schema exists
docker exec supabase-db psql -U postgres -d postgres -c "\dn"

# Check tables
docker exec supabase-db psql -U postgres -d postgres -c "\dt xinote.*"

# Test connection with credentials
docker exec xinote-backend wget -O- http://supabase-kong:8000
```

---

## 🔄 Updates & Maintenance

### Update the backend code

```bash
cd /opt/xinote-backend
git pull  # If using git
./docker/deploy.sh
```

### View logs

```bash
docker compose -f /opt/xinote-backend/docker/docker-compose.yml logs -f xinote-backend
```

### Backup database

```bash
# Backup xinote schema
docker exec supabase-db pg_dump -U postgres -d postgres -n xinote > xinote-backup-$(date +%Y%m%d).sql
```

### Restart services

```bash
cd /opt/xinote-backend/docker
docker compose restart
```

---

## 📊 Monitoring

### Check resource usage

```bash
docker stats xinote-backend
```

### Check disk space

```bash
df -h
docker system df
```

### Check Supabase storage

```bash
docker exec supabase-db psql -U postgres -d postgres -c "
SELECT * FROM xinote.storage_statistics;
"
```

---

## ✅ Deployment Checklist

- [ ] DNS configured (xinote.amega.one → 64.225.76.110)
- [ ] Files uploaded to `/opt/xinote-backend/`
- [ ] Database schema created (`./setup-database.sh`)
- [ ] `.env` file configured with all secrets
- [ ] Caddy configuration added and reloaded
- [ ] Backend deployed (`./deploy.sh`)
- [ ] Health check passing
- [ ] API key created for Flutter app
- [ ] Test API endpoints work
- [ ] SSL certificate issued by Caddy
- [ ] Backup strategy configured

---

## 📞 Next Steps

1. **Update Flutter App**: Change the backend URL in the Flutter app to `https://xinote.amega.one`
2. **Migrate Data**: If you have existing n8n data, run migration scripts
3. **Test End-to-End**: Record audio, upload, and verify transcription works
4. **Monitor**: Check logs and performance for first few days
5. **Disable n8n**: Once confident, you can stop the old n8n webhook

---

## 🎯 API Endpoints Available

After deployment, these endpoints will be available:

```
GET  /api/health                    - Health check
POST /api/auth/login                - Doctor login
GET  /api/doctor/profile            - Get doctor profile

POST /api/recordings/upload         - Upload audio file
GET  /api/recordings                - List recordings
GET  /api/recordings/:id            - Get recording details
DELETE /api/recordings/:id          - Delete recording

POST /api/transcriptions            - Create transcription
GET  /api/transcriptions/:id        - Get transcription

GET  /api/patients                  - List patients
POST /api/patients                  - Create patient
GET  /api/patients/:id              - Get patient details

GET  /api/audit                     - View audit logs
```

Full API documentation will be generated in the next step!
