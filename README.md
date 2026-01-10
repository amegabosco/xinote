# Xinote Backend

Docker deployment configuration for Xinote medical transcription backend.

## 🚀 Quick Start

This repository contains the complete Docker setup to deploy the Xinote backend on your server.

### What's Included

- **Docker Compose** configuration with Supabase integration
- **PostgreSQL database** schema in isolated `xinote` namespace
- **Automated setup scripts** for DigitalOcean deployment
- **Complete documentation** with safety guarantees
- **Caddy reverse proxy** configuration
- **Zero disruption** to existing services

### Documentation

- **[WEB_CONSOLE_GUIDE.md](docker/WEB_CONSOLE_GUIDE.md)** - Step-by-step for DigitalOcean web console
- **[DEPLOYMENT_GUIDE.md](docker/DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[SAFETY_CHECKLIST.md](docker/SAFETY_CHECKLIST.md)** - Guarantees no disruption to existing setup
- **[README.md](docker/README.md)** - Docker setup documentation

### Deployment on Your Server

```bash
# SSH to your server or use DigitalOcean web console
cd /opt

# Clone this repository (full project including Flutter app)
git clone https://github.com/amegabosco/xinote.git
cd xinote

# Set up database
cd docker/supabase
./setup-database.sh

# Configure environment
cd ../
cp .env.example .env
nano .env  # Fill in your credentials

# Deploy
./deploy.sh
```

### Architecture

```
Flutter App → Caddy (HTTPS) → Xinote Backend → Supabase (xinote schema)
                                              ↓
                                          OpenAI Whisper
```

### Safety Features

✅ **Separate PostgreSQL Schema** - `xinote` schema isolated from existing data
✅ **Separate Docker Network** - No conflicts with existing containers  
✅ **Different Port** - Uses port 3001
✅ **Own Volumes** - Dedicated storage
✅ **Easy Rollback** - Complete removal instructions included

### Server Requirements

- Docker & Docker Compose v2
- Existing Supabase instance
- 2GB+ available disk space
- Port 3001 available

### Features

- 🎙️ Audio file upload (M4A format)
- 🤖 Whisper API transcription
- 🔒 GDPR-compliant data encryption
- 👨‍⚕️ Multi-doctor support
- 📊 Admin dashboard (coming soon)
- 🔐 Row-level security
- 📝 Audit logging

### License

Private - Medical data handling application

### Support

For deployment issues, see the troubleshooting section in [DEPLOYMENT_GUIDE.md](docker/DEPLOYMENT_GUIDE.md).
