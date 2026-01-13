# Quick Test Guide - Xinote Mobile App

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Samsung Galaxy S10+ with USB debugging enabled
- Flutter SDK installed
- Android SDK configured
- Device connected via USB or WiFi

### Build & Install
```bash
cd /Users/amegabosco/Documents/Projets/xinote

# Build release APK
flutter build apk --release

# Install on device
flutter install
```

**APK Location**: `build/app/outputs/flutter-apk/app-release.apk`

---

## 🧪 Test Credentials

```
Email: admin@xinote.local
Password: SecurePass123!
```

---

## ✅ Quick Test Checklist (10 Minutes)

### 1. Login Test (2 minutes)
```
1. Open Xinote app
2. Enter email: admin@xinote.local
3. Enter password: SecurePass123!
4. Tap "Se connecter"
5. ✅ Should navigate to home screen
```

### 2. Doctor Info Auto-Fill Test (1 minute)
```
1. From home screen, tap "Nouveau Patient" (or equivalent)
2. ✅ Check that "Médecin prescripteur" field is pre-filled
3. ✅ Check that "Structure médicale" field is pre-filled
```

### 3. Recording & Upload Test (5 minutes)
```
1. Fill patient information:
   - Nom: TEST PATIENT
   - Âge: 35
   - Sexe: M
2. Tap "Continuer vers l'enregistrement"
3. Tap red record button
4. Speak for 10-15 seconds
5. Tap stop button
6. Tap "Envoyer" button (blue, cloud icon)
7. ✅ Should see "Synchronisation réussie" message
```

### 4. Dashboard Verification (2 minutes)
```
1. Open browser: https://xinote.amega.one/dashboard
2. Login with same credentials
3. ✅ Check that your recording appears in the list
4. Wait 30 seconds
5. ✅ Refresh page, transcription should appear
```

---

## 🔍 Detailed Test Scenarios

### Scenario A: Online Login
**Expected Result**: Successful login, profile data stored

```
Steps:
1. Ensure device has internet connection
2. Open app
3. Enter credentials
4. Tap "Se connecter"

✅ Pass Criteria:
- No error message
- Navigates to home screen
- Doctor info pre-fills in patient form
```

### Scenario B: Offline Login
**Expected Result**: Login works using stored credentials

```
Steps:
1. Login once while online (Scenario A)
2. Logout (if logout button exists)
3. Enable airplane mode
4. Reopen app
5. Enter same credentials
6. Tap "Se connecter"

✅ Pass Criteria:
- Shows orange "Mode hors ligne disponible" banner
- Login succeeds
- App remains functional
```

### Scenario C: Recording Upload (WiFi)
**Expected Result**: Recording uploads and transcription starts

```
Steps:
1. Connect to WiFi
2. Login
3. Create patient + record audio
4. Tap "Envoyer"

✅ Pass Criteria:
- "Envoi en cours..." message appears
- "Synchronisation réussie" dialog shows
- Recording appears in dashboard within 10 seconds
- Transcription completes within 60 seconds
```

### Scenario D: Offline Recording Queue
**Expected Result**: Recording saved locally, uploads when online

```
Steps:
1. Enable airplane mode
2. Create patient + record audio
3. Tap "Envoyer"
4. Note: Should save locally
5. Disable airplane mode
6. Wait or trigger sync

✅ Pass Criteria:
- Recording saved locally
- Auto-uploads when WiFi detected
- Appears in dashboard after sync
```

---

## 🐛 Troubleshooting

### Login Fails
```bash
# Check backend is running
curl https://xinote.amega.one/api/health

# Should return: {"status":"healthy","database":"healthy"}
```

### Upload Fails
```bash
# Check authentication
# Look for "401 Unauthorized" in app logs

# Check file size
# M4A files should be < 100MB

# Check patient creation
# Verify patient appears in dashboard first
```

### Transcription Not Appearing
```bash
# Check OpenAI API key is configured on server
docker exec xinote-backend printenv OPENAI_API_KEY

# Check backend logs for errors
docker logs xinote-backend --tail 50
```

---

## 📱 Development Testing

### Run in Debug Mode
```bash
# Connect device
flutter devices

# Run with logs
flutter run --release
```

### View Logs
```bash
# Flutter logs
flutter logs

# Android logs
adb logcat | grep flutter
```

### Clear App Data (Reset)
```bash
# Uninstall completely
adb uninstall com.yao.xinote

# Reinstall
flutter install
```

---

## ✨ Expected User Flow

```
1. User opens app
   ↓
2. Login screen appears
   ↓
3. User enters credentials
   ↓
4. [ONLINE] → Backend validates → Profile stored locally
   [OFFLINE] → Local verification → Continue with cached profile
   ↓
5. Home screen with "Nouveau Patient" button
   ↓
6. Patient info form (doctor info pre-filled)
   ↓
7. User fills patient details
   ↓
8. Recording screen
   ↓
9. User records audio
   ↓
10. User taps "Envoyer"
    ↓
11. XinoteSyncService uploads:
    - Creates patient (if new)
    - Uploads audio file
    - Triggers transcription
    ↓
12. Success message displayed
    ↓
13. Recording appears in web dashboard
    ↓
14. Transcription completes (30-60s)
    ↓
15. Doctor views transcript online
```

---

## 🎯 Success Criteria

**Must Pass:**
- ✅ Login works online
- ✅ Login works offline (after first online login)
- ✅ Doctor info auto-populates
- ✅ Recording uploads successfully
- ✅ Transcription appears in dashboard

**Nice to Have:**
- ⭐ Offline recordings queue and sync later
- ⭐ Sync status messages clear and helpful
- ⭐ No crashes during normal usage
- ⭐ UI responsive and smooth

---

## 📊 Performance Metrics

**Target Times:**
- Login: < 3 seconds
- Recording start: < 1 second
- Upload (10MB file): < 30 seconds on WiFi
- Transcription: < 60 seconds for 1-minute audio

---

## 🔗 Useful Links

- **Dashboard**: https://xinote.amega.one/dashboard
- **API Health**: https://xinote.amega.one/api/health
- **Backend Logs**: `docker logs xinote-backend`
- **Full Documentation**: [MOBILE_INTEGRATION_COMPLETE.md](MOBILE_INTEGRATION_COMPLETE.md)

---

## 📞 Quick Support Commands

```bash
# Check backend status
curl https://xinote.amega.one/api/health

# View backend logs
docker logs xinote-backend --tail 100

# Check recordings in dashboard
open https://xinote.amega.one/dashboard

# Rebuild app
flutter clean && flutter build apk --release

# Clear app data
adb shell pm clear com.yao.xinote
```

---

**Last Updated**: January 13, 2026
**Status**: Ready for Testing
