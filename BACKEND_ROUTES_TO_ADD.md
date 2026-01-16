# Backend Routes à Ajouter Manuellement

Le dossier `xinote-backend/` est dans .gitignore. Voici les fichiers à créer/copier manuellement sur le serveur:

## Nouveaux fichiers créés

Les fichiers suivants ont été créés localement et doivent être copiés sur le serveur:

### 1. Routes créées:
```
xinote-backend/src/routes/
├── auth.routes.js          (NOUVEAU)
├── health.routes.js        (NOUVEAU)
├── recording.routes.js     (NOUVEAU)
├── sync.routes.js          (NOUVEAU)
├── transcription.routes.js (NOUVEAU)
├── report.routes.js        (existe déjà)
├── analytics.routes.js     (existe déjà)
├── auditLogs.routes.js     (existe déjà)
├── monitoring.routes.js    (existe déjà)
└── users.routes.js         (existe déjà)
```

## Option 1: Copie manuelle via SCP

```bash
# Depuis votre machine locale
cd /Users/amegabosco/Documents/Projets/xinote

# Copier les nouveaux fichiers routes
scp xinote-backend/src/routes/auth.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
scp xinote-backend/src/routes/health.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
scp xinote-backend/src/routes/recording.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
scp xinote-backend/src/routes/sync.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
scp xinote-backend/src/routes/transcription.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
```

## Option 2: Création manuelle

Les contenus des fichiers sont disponibles dans votre session locale. Vous pouvez:

1. SSH sur le serveur
2. Créer les fichiers avec nano/vim
3. Copier le contenu depuis les fichiers locaux

## Vérification

Le fichier `xinote-backend/src/server.js` importe déjà ces routes:

```javascript
const authRoutes = require('./routes/auth.routes');
const recordingRoutes = require('./routes/recording.routes');
const transcriptionRoutes = require('./routes/transcription.routes');
const syncRoutes = require('./routes/sync.routes');
const healthRoutes = require('./routes/health.routes');
```

Donc une fois les fichiers copiés, il suffit de redémarrer le backend.

## Dependencies requises

Assurez-vous que ces packages sont installés:

```bash
cd xinote-backend
npm install multer @supabase/supabase-js
```

Ces packages sont déjà dans server.js mais vérifiez package.json.
