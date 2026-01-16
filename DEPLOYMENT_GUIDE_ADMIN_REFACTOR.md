# Guide de déploiement - Refonte Admin & Backend-to-Device

**Date:** 2026-01-16
**Composants:** Admin Interface, Backend API, Database, Mobile App

---

## 📋 Vue d'ensemble des changements

Cette mise à jour refond complètement l'interface admin et ajoute un système de communication bidirectionnel entre le backend et les devices mobiles.

### Nouveautés principales:
- ✅ Interface admin avec vue détaillée des enregistrements
- ✅ Affichage complet des transcriptions avec termes médicaux
- ✅ Système de notifications push automatiques
- ✅ Endpoint de synchronisation pour les devices
- ✅ Routes backend complètes (recordings, auth, sync, transcriptions)

---

## 🗄️ ÉTAPE 1: Mise à jour de la base de données

### 1.1 Appliquer la nouvelle migration

```bash
# Se connecter au serveur
ssh user@xinote.amega.one

# Aller dans le dossier du projet
cd /path/to/xinote

# Vérifier que PostgreSQL est accessible
psql -U xinote_user -d xinote_db -c "SELECT version();"

# Appliquer la migration
psql -U xinote_user -d xinote_db -f database/migrations/007_device_tokens.sql
```

### 1.2 Vérifier la migration

```bash
# Vérifier que les tables ont été créées
psql -U xinote_user -d xinote_db -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'xinote'
AND table_name IN ('device_tokens', 'notification_queue');
"

# Vérifier les triggers
psql -U xinote_user -d xinote_db -c "
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'xinote';
"

# Devrait afficher:
# - trigger_notify_transcript_complete sur transcriptions
# - trigger_notify_report_complete sur report_metadata
```

### 1.3 Vérifier les permissions RLS

```bash
psql -U xinote_user -d xinote_db -c "
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'xinote'
AND tablename IN ('device_tokens', 'notification_queue');
"

# rowsecurity devrait être 't' (true) pour les deux tables
```

---

## 🔧 ÉTAPE 2: Mise à jour du Backend API

### 2.1 Arrêter le backend actuel

```bash
# Si vous utilisez PM2
pm2 stop xinote-backend

# Ou si vous utilisez systemd
sudo systemctl stop xinote-backend

# Ou si c'est un processus Node direct
pkill -f "node.*xinote-backend"
```

### 2.2 Sauvegarder et déployer les nouveaux fichiers

```bash
# Créer une sauvegarde
cd /path/to/xinote-backend
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# Copier les nouveaux fichiers de routes
# (Depuis votre machine locale, via scp ou git)

# Option A: Via Git (recommandé)
git pull origin main
# Ou
git checkout feature/admin-refactor
git pull

# Option B: Via SCP (si pas de git)
scp src/routes/recording.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
scp src/routes/auth.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
scp src/routes/transcription.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
scp src/routes/sync.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
scp src/routes/health.routes.js user@xinote.amega.one:/path/to/xinote-backend/src/routes/
```

### 2.3 Installer les dépendances (si nécessaire)

```bash
cd /path/to/xinote-backend

# Vérifier que toutes les dépendances sont présentes
npm install

# Dépendances requises (normalement déjà installées):
# - express
# - @supabase/supabase-js
# - multer (pour upload de fichiers)
# - dotenv
# - pg (PostgreSQL client)
```

### 2.4 Vérifier la configuration

```bash
# Vérifier que .env contient toutes les variables nécessaires
cat .env

# Variables requises:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=xinote_db
# DB_USER=xinote_user
# DB_PASSWORD=your_password
# DB_SSL=false
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# OPENAI_API_KEY=sk-...
# PORT=3000
# NODE_ENV=production
# CORS_ORIGIN=https://admin.xinote.amega.one,https://xinote.amega.one
# CORS_CREDENTIALS=true
```

### 2.5 Tester le backend avant de redémarrer

```bash
# Test de syntaxe
node -c src/server.js

# Test de démarrage (en mode test)
NODE_ENV=test node src/server.js &
TEST_PID=$!

# Attendre 2 secondes
sleep 2

# Tester le endpoint health
curl http://localhost:3000/api/v1/health

# Devrait retourner:
# {"success":true,"service":"xinote-api","status":"healthy",...}

# Tuer le processus test
kill $TEST_PID
```

### 2.6 Redémarrer le backend

```bash
# Avec PM2 (recommandé)
pm2 restart xinote-backend
pm2 logs xinote-backend --lines 50

# Vérifier que les routes sont chargées
pm2 logs xinote-backend | grep "🚀 Xinote API server running"

# Ou avec systemd
sudo systemctl start xinote-backend
sudo systemctl status xinote-backend
journalctl -u xinote-backend -f

# Ou en direct (pour debug uniquement)
cd /path/to/xinote-backend
NODE_ENV=production npm start
```

### 2.7 Vérifier que les nouveaux endpoints fonctionnent

```bash
# Health check
curl https://xinote.amega.one/api/v1/health

# Auth (devrait retourner 400 si pas de credentials)
curl -X POST https://xinote.amega.one/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'

# Recordings (devrait retourner 401 sans auth)
curl https://xinote.amega.one/api/v1/recordings

# Sync (devrait retourner 401 sans auth)
curl https://xinote.amega.one/api/v1/sync/pending-updates
```

---

## 🌐 ÉTAPE 3: Mise à jour de l'interface Admin

### 3.1 Arrêter l'admin actuel

```bash
# Si vous utilisez PM2
pm2 stop xinote-admin

# Ou si vous utilisez un reverse proxy statique
# (pas besoin d'arrêter, juste rebuild)
```

### 3.2 Déployer les nouveaux fichiers

```bash
# Sauvegarder
cd /path/to/xinote-admin
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# Déployer via Git (recommandé)
git pull origin main

# Ou via SCP
scp -r src/routes/recordings user@xinote.amega.one:/path/to/xinote-admin/src/routes/
scp -r src/routes/dashboard user@xinote.amega.one:/path/to/xinote-admin/src/routes/
scp -r src/routes/api user@xinote.amega.one:/path/to/xinote-admin/src/routes/
```

### 3.3 Installer les dépendances et rebuild

```bash
cd /path/to/xinote-admin

# Installer les dépendances (si package.json a changé)
npm install

# Build pour production
npm run build

# Vérifier que le build a réussi
ls -lh build/
```

### 3.4 Configurer les variables d'environnement

```bash
# Créer/éditer .env
cat > .env << EOF
BACKEND_URL=https://xinote.amega.one
PUBLIC_BACKEND_URL=https://xinote.amega.one
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=production
EOF
```

### 3.5 Redémarrer l'admin

```bash
# Avec PM2
pm2 restart xinote-admin
pm2 logs xinote-admin --lines 50

# Ou avec un serveur statique (si SvelteKit adapter-static)
# Le nouveau build est déjà en place, Nginx/Apache le servira automatiquement

# Si vous utilisez adapter-node
cd /path/to/xinote-admin
PORT=3001 node build/index.js &
```

### 3.6 Vérifier l'accès

```bash
# Tester la page dashboard
curl -I https://admin.xinote.amega.one/dashboard

# Devrait retourner 303 redirect vers /login (si pas authentifié)
# ou 200 OK (si cookies de session présents)
```

---

## 📱 ÉTAPE 4: Mise à jour de l'application mobile

### 4.1 Modifications à apporter dans le code Flutter

**Fichier:** `lib/services/sync_service.dart`

```dart
// Ajouter la méthode pour récupérer les mises à jour en attente
Future<Map<String, dynamic>> getPendingUpdates({
  required String lastSyncTimestamp,
}) async {
  try {
    final token = await _apiService.getAccessToken();
    final doctorId = await _apiService.getDoctorId();

    final response = await http.get(
      Uri.parse('$_baseUrl/api/v1/sync/pending-updates?last_sync_timestamp=$lastSyncTimestamp'),
      headers: {
        'Authorization': 'Bearer $token',
        'x-doctor-id': doctorId,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to fetch pending updates: ${response.statusCode}');
    }
  } catch (e) {
    _logger.error('Get pending updates failed: $e');
    rethrow;
  }
}

// Ajouter la méthode pour enregistrer le device token
Future<bool> registerDeviceToken({
  required String deviceToken,
  String? deviceType,
  Map<String, dynamic>? deviceInfo,
}) async {
  try {
    final token = await _apiService.getAccessToken();
    final doctorId = await _apiService.getDoctorId();

    final response = await http.post(
      Uri.parse('$_baseUrl/api/v1/sync/register-device'),
      headers: {
        'Authorization': 'Bearer $token',
        'x-doctor-id': doctorId,
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'device_token': deviceToken,
        'device_type': deviceType ?? 'android',
        'device_info': deviceInfo,
      }),
    );

    return response.statusCode == 200;
  } catch (e) {
    _logger.error('Register device token failed: $e');
    return false;
  }
}
```

**Fichier:** `lib/services/xinote_api_service.dart`

```dart
// Modifier getRecordingDetails pour utiliser le nouveau endpoint
Future<Map<String, dynamic>> getRecordingDetails(String recordingId) async {
  try {
    final token = await getAccessToken();
    final doctorId = await getDoctorId();

    final response = await http.get(
      Uri.parse('$_baseUrl/api/v1/recordings/$recordingId'),
      headers: {
        'Authorization': 'Bearer $token',
        'x-doctor-id': doctorId,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data']; // Contient maintenant recording + transcript + reports
    } else {
      throw Exception('Failed to get recording: ${response.statusCode}');
    }
  } catch (e) {
    throw Exception('Get recording failed: $e');
  }
}
```

### 4.2 Compiler et déployer l'APK

```bash
# Sur votre machine de développement
cd /path/to/xinote

# Build pour production
flutter build apk --release

# L'APK sera dans: build/app/outputs/flutter-apk/app-release.apk

# Transférer sur le device ou publier sur Play Store
```

### 4.3 Tester sur le device

```bash
# Installer l'APK sur le Samsung Galaxy S10+
adb install -r build/app/outputs/flutter-apk/app-release.apk

# Vérifier les logs
adb logcat | grep -i xinote
```

---

## 🧪 ÉTAPE 5: Tests de bout en bout

### 5.1 Test du flux complet

```bash
# 1. Upload un enregistrement depuis le mobile
# (Utiliser l'app mobile)

# 2. Vérifier que l'enregistrement apparaît dans l'admin
curl -X GET "https://admin.xinote.amega.one/api/recordings" \
  -H "Cookie: sb-access-token=YOUR_SESSION_TOKEN"

# 3. Déclencher une transcription depuis l'admin
# (Cliquer sur "Lancer la transcription" dans l'UI)

# 4. Vérifier que la notification a été créée
psql -U xinote_user -d xinote_db -c "
SELECT * FROM xinote.notification_queue
ORDER BY created_at DESC
LIMIT 5;
"

# 5. Vérifier que le mobile peut récupérer les updates
# (Depuis l'app mobile, appeler getPendingUpdates)

# 6. Générer un rapport depuis l'admin
# (Cliquer sur "Générer un rapport")

# 7. Vérifier que la notification rapport a été créée
psql -U xinote_user -d xinote_db -c "
SELECT * FROM xinote.notification_queue
WHERE notification_type = 'report_ready'
ORDER BY created_at DESC
LIMIT 5;
"
```

### 5.2 Test des endpoints individuels

```bash
# Préparer un token d'authentification
TOKEN="your_jwt_token_here"
DOCTOR_ID="your_doctor_uuid_here"

# Test: Get recordings
curl -X GET "https://xinote.amega.one/api/v1/recordings?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-doctor-id: $DOCTOR_ID"

# Test: Get recording details
curl -X GET "https://xinote.amega.one/api/v1/recordings/{recording_id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-doctor-id: $DOCTOR_ID"

# Test: Get pending updates
LAST_SYNC="2026-01-01T00:00:00Z"
curl -X GET "https://xinote.amega.one/api/v1/sync/pending-updates?last_sync_timestamp=$LAST_SYNC" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-doctor-id: $DOCTOR_ID"

# Test: Register device
curl -X POST "https://xinote.amega.one/api/v1/sync/register-device" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-doctor-id: $DOCTOR_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "fcm_token_example",
    "device_type": "android",
    "device_info": {"model": "Samsung Galaxy S10+", "os": "Android 12"}
  }'
```

---

## 🔍 ÉTAPE 6: Monitoring et vérification

### 6.1 Vérifier les logs du backend

```bash
# Avec PM2
pm2 logs xinote-backend --lines 100

# Chercher des erreurs
pm2 logs xinote-backend --err

# Avec systemd
journalctl -u xinote-backend -f -n 100
```

### 6.2 Vérifier les logs de l'admin

```bash
# Avec PM2
pm2 logs xinote-admin --lines 100

# Vérifier les requêtes
tail -f /var/log/nginx/admin.xinote.amega.one.access.log
tail -f /var/log/nginx/admin.xinote.amega.one.error.log
```

### 6.3 Vérifier la base de données

```bash
# Connexions actives
psql -U xinote_user -d xinote_db -c "
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'xinote_db';
"

# Dernières transcriptions
psql -U xinote_user -d xinote_db -c "
SELECT
  r.id,
  r.exam_datetime,
  t.processing_method,
  t.transcription_completed_at
FROM xinote.recordings r
LEFT JOIN xinote.transcriptions t ON r.id = t.recording_id
ORDER BY r.created_at DESC
LIMIT 10;
"

# Notifications en attente
psql -U xinote_user -d xinote_db -c "
SELECT
  notification_type,
  status,
  COUNT(*) as count
FROM xinote.notification_queue
GROUP BY notification_type, status;
"

# Devices enregistrés
psql -U xinote_user -d xinote_db -c "
SELECT
  d.id,
  doc.email,
  d.device_type,
  d.created_at,
  d.is_active
FROM xinote.device_tokens d
JOIN xinote.doctors doc ON d.doctor_id = doc.id
WHERE d.is_active = true;
"
```

---

## 🚨 Rollback en cas de problème

### Si le backend ne démarre pas:

```bash
# Restaurer l'ancienne version
cd /path/to/xinote-backend
rm -rf src/routes
cp -r src.backup.YYYYMMDD_HHMMSS/routes src/

# Redémarrer
pm2 restart xinote-backend
```

### Si la base de données a un problème:

```bash
# Rollback de la migration
psql -U xinote_user -d xinote_db << EOF
DROP TRIGGER IF EXISTS trigger_notify_transcript_complete ON xinote.transcriptions;
DROP TRIGGER IF EXISTS trigger_notify_report_complete ON xinote.report_metadata;
DROP FUNCTION IF EXISTS xinote.create_notification_on_transcript_complete();
DROP FUNCTION IF EXISTS xinote.create_notification_on_report_complete();
DROP TABLE IF EXISTS xinote.notification_queue;
DROP TABLE IF EXISTS xinote.device_tokens;
EOF
```

### Si l'admin ne fonctionne pas:

```bash
# Restaurer l'ancienne version
cd /path/to/xinote-admin
rm -rf src/routes
cp -r src.backup.YYYYMMDD_HHMMSS/routes src/

# Rebuild
npm run build

# Redémarrer
pm2 restart xinote-admin
```

---

## ✅ Checklist finale

- [ ] Migration 007 appliquée avec succès
- [ ] Tables `device_tokens` et `notification_queue` créées
- [ ] Triggers fonctionnent (vérifier avec un test)
- [ ] Backend redémarré et tous les endpoints répondent
- [ ] Admin rebuild et accessible
- [ ] Page `/dashboard` affiche les enregistrements
- [ ] Page `/recordings/[id]` affiche les détails
- [ ] Bouton "Lancer la transcription" fonctionne
- [ ] Bouton "Générer un rapport" fonctionne
- [ ] Endpoint `/sync/pending-updates` retourne des données
- [ ] Logs backend ne montrent pas d'erreurs
- [ ] Logs admin ne montrent pas d'erreurs
- [ ] App mobile peut se connecter et fetch des données

---

## 📞 Support et documentation

### Fichiers de référence:
- Architecture complète: `programming_history/auto_context_2026-01-16_12-00.md`
- Migration SQL: `database/migrations/007_device_tokens.sql`
- Guide backend: `BACKEND_DEPLOYMENT_GUIDE.md`

### En cas de problème:
1. Vérifier les logs: `pm2 logs` ou `journalctl`
2. Vérifier la DB: connexions, tables, triggers
3. Tester les endpoints individuellement avec curl
4. Consulter le fichier de contexte pour comprendre le flux

### Commandes utiles:

```bash
# Statut global
pm2 status

# Logs en temps réel
pm2 logs --lines 50

# Redémarrage complet
pm2 restart all

# Vérification DB
psql -U xinote_user -d xinote_db -c "\dt xinote.*"

# Test endpoint
curl https://xinote.amega.one/api/v1/health
```

---

**Date de déploiement:** _______________
**Déployé par:** _______________
**Validé par:** _______________

✅ **Déploiement terminé avec succès**
