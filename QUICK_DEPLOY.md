# Déploiement rapide - Commandes essentielles

## 🐳 Si vous utilisez Docker

```bash
# 1. Se connecter au serveur
ssh user@xinote.amega.one

# 2. Aller dans le dossier du projet
cd /path/to/xinote

# 3. Pull les derniers changements
git pull origin main
# ou
git pull origin feature/admin-refactor

# 4. Appliquer la migration database
docker exec xinote-postgres psql -U xinote_user -d xinote_db -f /migrations/007_device_tokens.sql
# ou si les migrations ne sont pas montées:
docker cp database/migrations/007_device_tokens.sql xinote-postgres:/tmp/
docker exec xinote-postgres psql -U xinote_user -d xinote_db -f /tmp/007_device_tokens.sql

# 5. Rebuild et restart les containers
docker-compose down
docker-compose build
docker-compose up -d

# 6. Vérifier que tout fonctionne
docker-compose logs -f --tail=50

# 7. Tester les endpoints
curl https://xinote.amega.one/api/v1/health
```

## 📦 Si vous utilisez Docker sans docker-compose

```bash
# Pull
cd /path/to/xinote
git pull origin main

# Migration DB
docker exec xinote-db psql -U xinote_user -d xinote_db -f /path/to/migrations/007_device_tokens.sql

# Backend
docker stop xinote-backend
docker rm xinote-backend
docker build -t xinote-backend ./xinote-backend
docker run -d --name xinote-backend \
  --env-file .env \
  -p 3000:3000 \
  xinote-backend

# Admin
docker stop xinote-admin
docker rm xinote-admin
docker build -t xinote-admin ./xinote-admin
docker run -d --name xinote-admin \
  --env-file .env \
  -p 3001:3001 \
  xinote-admin

# Vérifier
docker ps
docker logs xinote-backend --tail 50
docker logs xinote-admin --tail 50
```

## 🚀 Si vous n'utilisez PAS Docker (PM2)

```bash
# Pull
cd /path/to/xinote
git pull origin main

# Migration DB
psql -U xinote_user -d xinote_db -f database/migrations/007_device_tokens.sql

# Backend
cd xinote-backend
npm install
pm2 restart xinote-backend

# Admin
cd ../xinote-admin
npm install
npm run build
pm2 restart xinote-admin

# Vérifier
pm2 status
pm2 logs --lines 50
```

## ✅ Vérification rapide

```bash
# Health check
curl https://xinote.amega.one/api/v1/health

# Admin accessible
curl -I https://admin.xinote.amega.one/dashboard

# Vérifier la DB
docker exec xinote-postgres psql -U xinote_user -d xinote_db -c "SELECT COUNT(*) FROM xinote.device_tokens;"
# ou
psql -U xinote_user -d xinote_db -c "SELECT COUNT(*) FROM xinote.device_tokens;"
```

## 🔄 En cas de problème - Rollback rapide

```bash
# Rollback git
git reset --hard HEAD~1
git pull origin main

# Restart containers
docker-compose restart
# ou
pm2 restart all
```

---

**C'est tout! 🎉**

Après le déploiement, testez l'admin à: `https://admin.xinote.amega.one/dashboard`
