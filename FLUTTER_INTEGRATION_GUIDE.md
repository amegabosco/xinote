# Flutter App Integration Guide

## Overview

This guide explains how to integrate the Flutter mobile app with the new Xinote backend API.

## Files Created

### 1. `/lib/services/xinote_api_service.dart`

Complete API service for communicating with Xinote backend.

**Key Features:**
- Login with email/password
- Automatic token refresh
- Secure token storage
- Patient management
- Recording upload
- Transcription triggering

**Methods:**
- `login(email, password)` - Authenticate doctor
- `isLoggedIn()` - Check auth status
- `logout()` - Clear all tokens
- `ensureValidToken()` - Auto-refresh if needed
- `createOrGetPatient(patientCode, encryptedName)` - Create patient
- `uploadRecording(audioFile, patientId, ...)` - Upload audio
- `transcribeRecording(recordingId)` - Trigger Whisper transcription
- `getRecordings(...)` - List recordings
- `getRecordingDetails(recordingId)` - Get recording info

### 2. `/lib/screens/login_screen.dart`

Login screen for doctors to authenticate.

**Features:**
- Email/password form
- Loading states
- Error handling
- Clean Material Design UI

### 3. `/lib/main.dart` (Modified)

Added authentication flow:
- `SplashScreen` - Checks if user is logged in on app start
- Routes for `/login` and `/home`
- Automatic navigation based on auth status

## Authentication Flow

```
App Start
   ↓
SplashScreen
   ↓
Is Logged In?
   ├─ Yes → Validate Token → Home Screen
   └─ No → Login Screen
            ↓
         Login Success
            ↓
         Home Screen
```

## Token Management

- **Access Token**: 1 hour expiry, auto-refreshes
- **Refresh Token**: 30-day validity
- **Storage**: Secure storage using `flutter_secure_storage`
- **Auto-Refresh**: Tokens refresh automatically before API calls

## Migrating from Old N8n Webhook

### Old Flow (N8n):
```dart
// lib/services/sync_service.dart
await _sendToN8n(recordingData); // POST to n8n webhook
```

### New Flow (Xinote API):
```dart
// 1. Login (once at app start)
await XinoteApiService.login(email, password);

// 2. Create/Get Patient
final patientId = await XinoteApiService.createOrGetPatient(
  patientCode: 'P12345',
  encryptedName: encryptedPatientName,
);

// 3. Upload Recording
final recordingId = await XinoteApiService.uploadRecording(
  audioFile: audioFile,
  patientId: patientId,
  durationSeconds: 120,
  recordedAt: DateTime.now().toIso8601String(),
  deviceInfo: deviceInfo,
);

// 4. Trigger Transcription
await XinoteApiService.transcribeRecording(recordingId);

// 5. Check Status
final recording = await XinoteApiService.getRecordingDetails(recordingId);
print(recording['recording']['status']); // pending, processing, completed, failed
```

## Next Steps

### 1. Update Recording Upload Flow

Modify `lib/services/sync_service.dart` or create a new service:

```dart
// lib/services/recording_upload_service.dart
import 'xinote_api_service.dart';

class RecordingUploadService {
  static Future<bool> uploadAndTranscribe({
    required File audioFile,
    required String patientCode,
    required String patientName,
    required int durationSeconds,
  }) async {
    try {
      // Ensure logged in
      final isLoggedIn = await XinoteApiService.isLoggedIn();
      if (!isLoggedIn) {
        throw Exception('Not authenticated');
      }

      // 1. Create or get patient
      final patientId = await XinoteApiService.createOrGetPatient(
        patientCode: patientCode,
        encryptedName: patientName, // TODO: Encrypt if needed
      );

      if (patientId == null) {
        throw Exception('Failed to create patient');
      }

      // 2. Upload recording
      final recordingId = await XinoteApiService.uploadRecording(
        audioFile: audioFile,
        patientId: patientId,
        durationSeconds: durationSeconds,
        recordedAt: DateTime.now().toIso8601String(),
      );

      if (recordingId == null) {
        throw Exception('Failed to upload recording');
      }

      // 3. Trigger transcription
      final transcribed = await XinoteApiService.transcribeRecording(recordingId);

      return transcribed;
    } catch (e) {
      logger.error('Upload and transcribe failed', e);
      return false;
    }
  }
}
```

### 2. Update Patient Info Screen

In `lib/screens/patient_info_screen.dart`, after recording is saved:

```dart
// Old code:
await syncService.syncRecording(recordingData);

// New code:
await RecordingUploadService.uploadAndTranscribe(
  audioFile: File(recordingData['filePath']),
  patientCode: patientCode,
  patientName: patientName,
  durationSeconds: duration,
);
```

### 3. Add Logout Option

In settings or home screen, add logout button:

```dart
ElevatedButton(
  onPressed: () async {
    await XinoteApiService.logout();
    Navigator.of(context).pushReplacementNamed('/login');
  },
  child: Text('Se déconnecter'),
)
```

### 4. Show Doctor Info

Display logged-in doctor's name:

```dart
FutureBuilder<Map<String, String?>>(
  future: XinoteApiService.getDoctorInfo(),
  builder: (context, snapshot) {
    if (snapshot.hasData) {
      return Text('Dr. ${snapshot.data!['name']}');
    }
    return CircularProgressIndicator();
  },
)
```

## Testing

### 1. Test Login
```
Email: admin@xinote.local
Password: SecurePass123!
```

### 2. Test Upload
- Record audio
- Upload should use new API
- Check dashboard at https://xinote.amega.one/dashboard

### 3. Test Token Refresh
- Login
- Wait 55 minutes
- Make API call
- Should auto-refresh without user noticing

## API Endpoints Used

- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/patients` - Create/get patient
- `POST /api/recordings/upload` - Upload audio
- `POST /api/recordings/{id}/transcribe` - Transcribe
- `GET /api/recordings` - List recordings
- `GET /api/recordings/{id}` - Get recording details

## Security Notes

- ✅ Tokens stored in secure storage (encrypted on device)
- ✅ Automatic token refresh prevents expiry
- ✅ HTTPS for all API calls
- ✅ No credentials stored in plain text
- ✅ Session expires after 30 days of inactivity

## Troubleshooting

### "Not authenticated" error
- Check if login was successful
- Verify tokens in secure storage
- Try logging out and in again

### Upload fails
- Check network connectivity
- Verify access token is valid
- Check backend logs

### Token refresh fails
- Refresh token may be expired (>30 days)
- Force logout and login again

## Dependencies

Required packages (already in pubspec.yaml):
- `http` - HTTP requests
- `flutter_secure_storage` - Secure token storage

## Complete Example Flow

```dart
// 1. App starts
await main();

// 2. SplashScreen checks auth
final isLoggedIn = await XinoteApiService.isLoggedIn();
if (!isLoggedIn) {
  // Navigate to LoginScreen
}

// 3. User logs in
await XinoteApiService.login('admin@xinote.local', 'SecurePass123!');

// 4. User records audio and enters patient info
final audioFile = File('/path/to/recording.m4a');
final patientCode = 'P12345';

// 5. Upload and transcribe
final success = await RecordingUploadService.uploadAndTranscribe(
  audioFile: audioFile,
  patientCode: patientCode,
  patientName: 'Patient Name',
  durationSeconds: 120,
);

if (success) {
  // Show success message
  // Recording is now in backend
  // Doctor can view in dashboard
}
```
