# Xinote MVP - Minimum Viable Product Features

**Date:** 2026-01-15
**Goal:** Define minimum features to test the complete workflow from recording to report

---

## 🎯 MVP SCOPE: Complete Workflow Test

The MVP should allow a doctor to:
1. **Login** to the app
2. **Create a patient** record
3. **Record audio** of a medical consultation
4. **Transcribe** the audio (cloud-based)
5. **Sync** the recording to the backend
6. **Generate a report** with AI analysis
7. **View/download** the PDF report

---

## ✅ MVP FEATURES (MUST HAVE)

### 1. AUTHENTICATION (WORKING ✅)
**What:** Simple login with email/password

**Files:**
- [lib/screens/login_screen.dart](lib/screens/login_screen.dart)
- [lib/services/xinote_api_service.dart](lib/services/xinote_api_service.dart)

**Features:**
- Email/password login
- JWT token storage
- Auto-login on app restart
- Offline login capability

**Test:**
```dart
// Login credentials
Email: test@xinote.com
Password: ********
```

**Status:** ✅ Working - CSRF issue fixed Jan 15

---

### 2. PATIENT CREATION (WORKING ✅)
**What:** Capture minimal patient information

**Files:**
- [lib/screens/patient_info_screen.dart](lib/screens/patient_info_screen.dart)
- [lib/services/xinote_api_service.dart](lib/services/xinote_api_service.dart)

**Required Fields:**
- Patient name (text)
- Age (number)
- Gender (dropdown)

**Backend:**
- `POST /api/patients` - Create or get patient
- Returns `patient_id` for recording association

**Status:** ✅ Working - Fixed to use direct PostgreSQL queries Jan 15

---

### 3. AUDIO RECORDING (WORKING ✅)
**What:** Record audio consultation in M4A format

**Files:**
- [lib/screens/recording_screen.dart](lib/screens/recording_screen.dart)
- [lib/services/audio_service.dart](lib/services/audio_service.dart)
- [lib/widgets/waveform_widget.dart](lib/widgets/waveform_widget.dart)

**Features:**
- Start/stop recording
- Real-time waveform visualization
- Recording duration display
- Playback capability
- M4A (AAC MP4) format

**Technical:**
- Uses `flutter_sound` package
- 50ms amplitude sampling
- Auto-stop at 15 minutes
- Silence detection (8 seconds warning)

**Status:** ✅ Working - Stable M4A format

---

### 4. CLOUD TRANSCRIPTION (WORKING ✅)
**What:** Backend transcription using OpenAI Whisper

**Files:**
- Backend: [xinote-backend/src/routes/transcription.routes.js](xinote-backend/src/routes/transcription.routes.js)
- Flutter: [lib/services/xinote_api_service.dart](lib/services/xinote_api_service.dart)

**Flow:**
1. Upload M4A file to backend
2. Backend calls OpenAI Whisper API
3. Transcription stored in database
4. Mobile app fetches transcription

**Backend Endpoint:**
```
POST /api/recordings/{id}/transcribe
```

**Status:** ✅ Working - Reliable cloud-based transcription

**Note:** Local on-device transcription is SKIPPED for MVP due to physical device compatibility issues

---

### 5. SYNC TO BACKEND (WORKING ✅)
**What:** Upload recording and metadata to Xinote backend

**Files:**
- [lib/services/xinote_sync_service.dart](lib/services/xinote_sync_service.dart)
- [lib/services/xinote_api_service.dart](lib/services/xinote_api_service.dart)

**Flow:**
1. Check connectivity (WiFi/mobile)
2. Verify authentication (valid token)
3. Create/get patient (`POST /api/patients`)
4. Upload M4A file (`POST /api/recordings/upload`)
5. Trigger transcription (`POST /api/recordings/{id}/transcribe`)
6. Mark as synced locally

**Backend Endpoints:**
```
POST /api/patients
POST /api/recordings/upload (multipart/form-data)
POST /api/recordings/{id}/transcribe
```

**Status:** ✅ Working - Connectivity monitoring active

---

### 6. REPORT GENERATION (WORKING ✅)
**What:** AI-powered PDF report generation

**Files:**
- [lib/services/report_generator_service.dart](lib/services/report_generator_service.dart)
- Backend: [xinote-backend/src/services/reportGeneratorService.js](xinote-backend/src/services/reportGeneratorService.js)
- Backend: [xinote-backend/src/services/aiExtractionService.js](xinote-backend/src/services/aiExtractionService.js)
- Backend: [xinote-backend/src/services/pdfGeneratorService.js](xinote-backend/src/services/pdfGeneratorService.js)

**Flow:**
1. User clicks "Générer rapport" button
2. `POST /api/v1/reports/generate {recording_id}`
3. Backend fetches transcription from database
4. GPT-4 analyzes transcription:
   - Extracts observations (bullet points)
   - Generates analysis summary
   - Generates medical conclusion
5. Puppeteer renders HTML to A4 PDF
6. PDF uploaded to Supabase Storage
7. Database updated with `report_metadata`
8. Mobile app downloads and displays PDF

**Backend Endpoints:**
```
POST /api/v1/reports/generate
GET /api/v1/reports/{reportId}/status
GET /api/v1/reports/{reportId}/download
```

**Status:** ✅ Working - Complete implementation Jan 15

---

### 7. VIEW REPORT (WORKING ✅)
**What:** Display transcription and download PDF

**Files:**
- [lib/screens/report_detail_screen.dart](lib/screens/report_detail_screen.dart)
- [lib/screens/reports_history_screen.dart](lib/screens/reports_history_screen.dart)

**Features:**
- Display transcription text
- Show report metadata (status, date, processing time)
- Download PDF button
- Open PDF in viewer (using `open_file` plugin)

**Status:** ✅ Working - UI functional

---

## ❌ MVP EXCLUSIONS (NOT NEEDED FOR TESTING)

### 1. LOCAL ON-DEVICE TRANSCRIPTION
**Why Skip:**
- ⚠️ Fails on physical Android devices (Samsung Galaxy S10+)
- Works on emulator but unreliable
- Cloud transcription is more accurate anyway
- OpenAI Whisper quality > Android speech-to-text

**Files to Skip:**
- [lib/services/hybrid_transcription_service.dart](lib/services/hybrid_transcription_service.dart) - Can be ignored for MVP

**Fallback:** Use cloud-based Whisper transcription exclusively

---

### 2. BIOMETRIC AUTHENTICATION
**Why Skip:**
- Optional feature, not required
- Password login is sufficient for testing
- Adds complexity without affecting core workflow

**Files to Skip:**
- Biometric-related code in [lib/services/secure_auth_service.dart](lib/services/secure_auth_service.dart)

**Note:** Can be tested separately after MVP

---

### 3. OFFLINE MODE & AUTO-SYNC
**Why Skip:**
- MVP assumes WiFi/mobile connectivity available
- Manual sync is sufficient for testing
- Auto-sync on WiFi detection is nice-to-have

**Files to Skip:**
- Connectivity monitoring in [lib/services/xinote_sync_service.dart](lib/services/xinote_sync_service.dart) (partial)

**Simplification:** Assume network is always available during MVP testing

---

### 4. HISTORY & SEARCH
**Why Skip:**
- Can manually check recordings in backend database
- History screen works but not critical for first test

**Files to Skip:**
- [lib/screens/reports_history_screen.dart](lib/screens/reports_history_screen.dart) (can be tested but not required)
- [lib/services/combined_history_service.dart](lib/services/combined_history_service.dart)

**Note:** Still functional, just not required for MVP validation

---

### 5. ADVANCED FEATURES
**Why Skip:**
- Not needed for core workflow
- Can be tested in phase 2

**Features:**
- Analytics
- Audit logging
- WebSocket real-time updates
- Bulk operations
- GDPR compliance features

---

## 🧪 MVP TEST WORKFLOW

### Step-by-Step Test Plan

```
┌─────────────────────────────────────────────────────────────────┐
│                    MVP COMPLETE WORKFLOW TEST                   │
└─────────────────────────────────────────────────────────────────┘

1️⃣ AUTHENTICATION
   ├─→ Launch app on Samsung Galaxy S10+
   ├─→ Login with test credentials
   │   Email: test@xinote.com
   │   Password: ********
   └─→ ✅ Verify: HomeScreen appears

2️⃣ PATIENT CREATION
   ├─→ Click "Nouvelle note"
   ├─→ Verify: Doctor name auto-populated from API
   ├─→ Verify: Structure auto-populated
   ├─→ Enter patient info:
   │   Name: Jean Dupont
   │   Age: 45
   │   Gender: Homme
   └─→ ✅ Verify: RecordingScreen appears

3️⃣ AUDIO RECORDING
   ├─→ Grant microphone permission if needed
   ├─→ Click red record button
   ├─→ Speak for 30-60 seconds (medical consultation simulation)
   │   Example: "Patient présente une douleur abdominale depuis 3 jours,
   │             localisée dans le quadrant inférieur droit. Pas de fièvre.
   │             Abdomen souple à la palpation. Diagnostic probable: appendicite."
   ├─→ Verify: Waveform animates in real-time
   ├─→ Verify: Duration counter increments
   ├─→ Click stop button
   └─→ ✅ Verify: Recording saved, playback available

4️⃣ SKIP LOCAL TRANSCRIPTION
   ├─→ DO NOT wait for local transcription
   ├─→ If transcription widget appears, ignore it
   └─→ ✅ Note: Will use cloud transcription instead

5️⃣ SYNC TO BACKEND
   ├─→ Click "Envoyer" (Send) button
   ├─→ Verify: Sync status indicator shows "syncing"
   ├─→ Wait for upload to complete (10-30 seconds depending on file size)
   ├─→ Verify: "Enregistrement synchronisé" message appears
   └─→ ✅ Backend should have:
       - Patient record in `patients` table
       - Recording entry in `recordings` table
       - M4A file in Supabase Storage at /app/uploads/{doctor_id}/
       - Status: "uploaded"

6️⃣ CLOUD TRANSCRIPTION (AUTOMATIC)
   ├─→ Backend automatically triggers Whisper API
   ├─→ Wait 20-60 seconds for transcription
   ├─→ Check backend database:
   │   SELECT * FROM xinote.transcriptions WHERE recording_id = '...';
   └─→ ✅ Verify: `whisper_transcript` field populated

7️⃣ REPORT GENERATION
   ├─→ Navigate to recording detail screen
   ├─→ Click "Générer rapport" button
   ├─→ Verify: Button shows "Génération en cours..."
   ├─→ Wait 30-90 seconds for:
   │   - GPT-4 content extraction
   │   - PDF generation
   │   - Upload to Supabase Storage
   ├─→ Verify: "Rapport prêt ✅" appears
   └─→ ✅ Backend should have:
       - Entry in `report_metadata` table
       - Status: "completed"
       - PDF URL pointing to Supabase Storage

8️⃣ VIEW REPORT
   ├─→ Click "Télécharger le rapport"
   ├─→ Verify: PDF downloads
   ├─→ Verify: PDF opens in viewer
   ├─→ Verify PDF contains:
   │   - Patient name: Jean Dupont
   │   - Patient age: 45 ans
   │   - Patient gender: Homme
   │   - Exam date
   │   - Full transcription
   │   - Observations (bullet points from GPT-4)
   │   - Analyse (summary from GPT-4)
   │   - Conclusion (medical conclusion from GPT-4)
   │   - Doctor signature
   └─→ ✅ COMPLETE MVP WORKFLOW TEST SUCCESSFUL!
```

---

## 🔍 VERIFICATION CHECKLIST

### Mobile App (Samsung Galaxy S10+)
- [ ] Login successful with test credentials
- [ ] Doctor profile auto-populated from backend
- [ ] Patient creation works
- [ ] Audio recording starts/stops correctly
- [ ] Waveform displays in real-time
- [ ] Recording duration accurate
- [ ] Playback functional
- [ ] Upload to backend successful (no errors)
- [ ] Sync status indicator shows correct state
- [ ] Report generation button appears
- [ ] Report generation progress tracked
- [ ] PDF download successful
- [ ] PDF opens in viewer

### Backend (https://xinote.amega.one)
- [ ] Health check endpoint responds: `GET /api/health`
- [ ] Login returns valid JWT token
- [ ] Patient creation endpoint works: `POST /api/patients`
- [ ] Recording upload endpoint works: `POST /api/recordings/upload`
- [ ] Transcription triggered automatically
- [ ] Whisper API called successfully
- [ ] Transcription stored in database
- [ ] Report generation endpoint works: `POST /api/v1/reports/generate`
- [ ] GPT-4 extraction successful
- [ ] PDF generation successful (Puppeteer)
- [ ] PDF uploaded to Supabase Storage
- [ ] Report metadata updated

### Database (Supabase PostgreSQL)
```sql
-- Verify patient created
SELECT * FROM xinote.patients ORDER BY created_at DESC LIMIT 1;

-- Verify recording uploaded
SELECT * FROM xinote.recordings ORDER BY created_at DESC LIMIT 1;

-- Verify transcription exists
SELECT * FROM xinote.transcriptions ORDER BY created_at DESC LIMIT 1;

-- Verify report metadata
SELECT * FROM xinote.report_metadata ORDER BY created_at DESC LIMIT 1;
```

### Supabase Storage
- [ ] M4A file exists at: `app/uploads/{doctor_id}/{recording_id}.m4a`
- [ ] PDF file exists at: `xinote-reports/{doctor_id}/{report_id}.pdf`

---

## 🐛 KNOWN ISSUES TO IGNORE FOR MVP

1. **Local transcription fails on physical device**
   - **Impact:** None - using cloud transcription
   - **Action:** Skip local transcription entirely

2. **Biometric not enforced**
   - **Impact:** None - password login sufficient
   - **Action:** Ignore biometric warnings

3. **No real-time updates**
   - **Impact:** Must manually refresh to see status changes
   - **Action:** User refreshes manually

4. **Analytics incomplete**
   - **Impact:** No usage statistics
   - **Action:** Not needed for MVP

---

## 📊 SUCCESS CRITERIA

### MVP is successful if:
✅ Complete workflow works end-to-end (login → record → transcribe → sync → report → view)
✅ No crashes or critical errors
✅ PDF report contains accurate transcription and AI analysis
✅ Report is professional quality (A4 format, proper formatting)
✅ Total time from recording to PDF < 3 minutes

### MVP fails if:
❌ Audio recording doesn't capture sound
❌ Upload to backend fails
❌ Transcription returns empty or garbage
❌ Report generation times out or errors
❌ PDF is malformed or missing data

---

## 🚀 NEXT STEPS AFTER MVP

Once MVP is validated:
1. Fix local transcription for physical devices
2. Implement history search/filtering
3. Add offline mode with auto-sync
4. Enable biometric authentication
5. Implement analytics endpoints
6. Add audit logging
7. WebSocket real-time updates
8. Bulk operations
9. Multi-doctor support
10. GDPR compliance features

---

## 🛠️ REQUIRED ENVIRONMENT SETUP

### Mobile App
- Flutter SDK: ^3.8.1
- Dart SDK: ^3.8.1
- Android device: Samsung Galaxy S10+ (or similar)
- Minimum Android version: SDK 21 (Android 5.0)

### Backend
```env
PORT=3000
NODE_ENV=production
API_VERSION=v1
CORS_ORIGIN=*
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### Database
- Supabase project with `xinote` schema
- Tables: doctors, patients, recordings, transcriptions, report_metadata
- RLS policies configured
- Storage buckets: app, xinote-reports

---

## 📝 MVP TESTING SCRIPT

```bash
# 1. Ensure backend is running
curl https://xinote.amega.one/api/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...}

# 2. Test authentication
curl -X POST https://xinote.amega.one/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@xinote.com","password":"your-password"}'
# Expected: {"token":"...","refreshToken":"...","doctor":{...}}

# 3. Launch Flutter app on device
cd /Users/amegabosco/Documents/Projets/xinote
flutter run --release

# 4. Follow test workflow steps above

# 5. Verify database records
# Use Supabase Studio or psql

# 6. Check logs
# Backend: docker logs xinote-backend
# Flutter: adb logcat | grep flutter
```

---

## ✅ FINAL MVP DEFINITION

**Minimum Features:**
1. ✅ Login (email/password)
2. ✅ Patient creation (name, age, gender)
3. ✅ Audio recording (M4A format)
4. ✅ Cloud transcription (Whisper API)
5. ✅ Sync to backend (upload + metadata)
6. ✅ Report generation (GPT-4 + PDF)
7. ✅ View/download report

**Total Screens Required:**
1. LoginScreen
2. HomeScreen
3. PatientInfoScreen
4. RecordingScreen
5. ReportDetailScreen (or ReportsHistoryScreen)

**Total Services Required:**
1. XinoteApiService (authentication, API client)
2. AudioService (recording, playback)
3. XinoteSyncService (upload, sync)
4. ReportGeneratorService (report API)

**Excluded:**
- Local transcription (broken on device)
- Biometric (optional)
- Offline mode (assumes connectivity)
- History search (nice-to-have)
- Analytics (not critical)

---

**MVP Complexity:** LOW
**Estimated Test Time:** 5-10 minutes per full workflow
**Success Rate Expected:** 95%+ (all components recently fixed)
