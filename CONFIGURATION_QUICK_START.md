# Xinote Configuration Quick Start Guide

## For Developers - Testing the Updated App

### 1. Build and Install

```bash
# Clean and rebuild
flutter clean
flutter pub get

# Build for Android
flutter build apk --release

# Install on connected device (Samsung Galaxy S10+)
flutter install
```

### 2. Configure Backend Connection

Open the Xinote app and navigate to **Settings** (⚙️ icon):

**Required Settings:**
- **URL du serveur backend:** `https://xinote.amega.one`
- **Endpoint API:** `/api/recordings/upload`
- **Clé API:** `xin_[your_api_key_here]`

**Optional Settings:**
- **Synchronisation automatique:** ON (for WiFi auto-sync)

### 3. Test Connection

Tap the **"TESTER LA CONNEXION"** button.

**Expected result:** "Connexion réussie" ✅

### 4. Record and Upload

1. Return to home screen
2. Tap **"Nouvelle Consultation"**
3. Enter patient information
4. Tap **"Commencer l'enregistrement"**
5. Speak for 15+ seconds
6. Tap **"Arrêter et sauvegarder"**
7. Tap **"SYNC WITH CLOUD"** to upload

### 5. Verify Backend Reception

**Check database:**
```sql
-- Connect to Supabase PostgreSQL
SELECT * FROM xinote.recordings
ORDER BY created_at DESC
LIMIT 5;
```

**Check admin dashboard:**
Visit `https://xinote.amega.one/dashboard` and log in to see uploaded recordings.

---

## For Doctors - First-Time Setup

### Step 1: Install the App
Install Xinote from the provided APK file on your Android device.

### Step 2: Initial Setup
On first launch, you'll be prompted to enter:
- Your full name
- Medical structure/clinic name
- Professional credentials (optional)

### Step 3: Configure Cloud Sync

1. Tap the **Settings** icon (⚙️)
2. Scroll to **"Configuration Serveur"**
3. The following should already be set (verify):
   - **URL du serveur backend:** `https://xinote.amega.one`
   - **Endpoint API:** `/api/recordings/upload`
4. Enter your **API Key** (provided by IT administrator)
   - Format: `xin_xxxxxxxxxxxx`
   - Keep this key secure

### Step 4: Test Your Connection

1. In Settings, tap **"TESTER LA CONNEXION"**
2. Wait for confirmation message: "Connexion réussie"
3. If you see an error, contact your IT administrator

### Step 5: Start Using Xinote

1. Return to the home screen
2. Tap **"Nouvelle Consultation"**
3. Enter patient details
4. Start recording your consultation
5. The app will automatically sync your recordings when connected to WiFi

---

## Default Configuration Values

```
Backend Base URL: https://xinote.amega.one
API Endpoint: /api/recordings/upload
Auto-Sync: Enabled (WiFi only)
Audio Format: M4A
Max Recording Duration: 15 minutes
Max File Size: 100 MB
```

---

## Obtaining an API Key

API keys are generated from the admin dashboard.

### For Administrators:

1. Log in to `https://xinote.amega.one/dashboard`
2. Navigate to **API Keys** section
3. Click **"Generate New Key"**
4. Select the doctor account
5. Set permissions (scopes): `recordings:upload`, `recordings:read`
6. Set expiration (recommended: 1 year)
7. Copy the generated key (starts with `xin_`)
8. Securely share with the doctor (encrypted email/messaging)

**Security Note:** API keys cannot be viewed again after generation. Store securely.

---

## Troubleshooting

### "Clé API manquante"
**Cause:** No API key configured
**Solution:** Add your API key in Settings → Configuration Serveur → Clé API

### "Erreur serveur 401"
**Cause:** Invalid or expired API key
**Solution:** Request a new API key from your administrator

### "Erreur serveur 403"
**Cause:** API key lacks required permissions
**Solution:** Contact administrator to update key scopes

### "Aucune connexion internet"
**Cause:** Device is offline
**Solution:** Connect to WiFi or mobile data. Recordings are saved locally and will sync when online.

### "Timeout de connexion"
**Cause:** Network issue or backend unavailable
**Solution:** Check internet connection. Try again in a few minutes.

### "Fichier audio introuvable"
**Cause:** Recording failed to save locally
**Solution:** Check device storage space. Try recording again.

---

## Security Best Practices

1. **Keep your API key private** - never share via unencrypted channels
2. **Use a strong device lock** - protect access to the app
3. **Enable biometric authentication** when prompted (recommended)
4. **Only use trusted WiFi networks** for syncing medical data
5. **Report lost/stolen devices immediately** to revoke API keys
6. **Review your recordings regularly** and delete old consultations when no longer needed

---

## Support Contact

For technical issues:
- **Email:** support@xinote.amega.one
- **Documentation:** https://docs.xinote.amega.one
- **Emergency:** Contact your IT administrator

For API key requests:
- Contact your organization's Xinote administrator
- Have your doctor ID ready

---

## What's New in This Version

### Backend Migration (January 2026)
- Migrated from n8n webhook to dedicated backend API
- Improved security with enhanced authentication
- Better transcription pipeline integration
- Real-time dashboard for viewing recordings
- Audit logging for GDPR compliance

### Updated Dependencies
- Latest Flutter packages for improved performance
- Enhanced connectivity detection
- Better security storage mechanisms

### Bug Fixes
- Improved waveform visualization
- Better error handling for network issues
- Enhanced offline mode stability

---

## FAQ

**Q: Is my patient data encrypted?**
A: Yes, all patient data is encrypted during transmission (HTTPS) and at rest in the database.

**Q: Can I use the app offline?**
A: Yes, recordings are saved locally on your device. They will automatically sync when you reconnect to WiFi.

**Q: How long are recordings stored?**
A: Recordings are stored for 7 years in compliance with medical data retention requirements.

**Q: Can I export my recordings?**
A: Yes, you can request data export from the admin dashboard (requires authentication).

**Q: What audio format is used?**
A: Recordings are saved in M4A format for optimal quality and compatibility with transcription services.

**Q: Is the transcription automatic?**
A: Yes, uploaded recordings are automatically transcribed using AI (OpenAI Whisper API).

**Q: What languages are supported?**
A: Currently French is the primary language. Additional languages can be configured upon request.

---

**Version:** 1.0 (Backend Migration)
**Last Updated:** January 12, 2026
**Target Device:** Android (Samsung Galaxy S10+ tested)
