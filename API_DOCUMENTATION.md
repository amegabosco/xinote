# Xinote Backend API Documentation

Base URL: `https://xinote.amega.one`

## Authentication

All API endpoints (except `/api/auth/login`) require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Mobile App Authentication Flow

### 1. Login

**POST** `/api/auth/login`

Authenticate a doctor and receive session tokens.

**Request Body:**
```json
{
  "email": "doctor@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.MFPjR...",
    "expires_at": 1234567890,
    "expires_in": 3600
  },
  "doctor": {
    "id": "uuid",
    "email": "doctor@example.com",
    "full_name": "Dr. Smith",
    "specialization": "Cardiology",
    "structure": "Hospital Name"
  }
}
```

**Storage:**
- Store `access_token`, `refresh_token`, and `expires_at` securely on device
- Use `access_token` in Authorization header for all API requests
- Token expires after 1 hour (3600 seconds)

### 2. Refresh Token

**POST** `/api/auth/refresh`

Refresh an expired access token.

**Request Body:**
```json
{
  "refresh_token": "v1.MFPjR..."
}
```

**Response:**
```json
{
  "success": true,
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v1.NewRefresh...",
    "expires_at": 1234567890,
    "expires_in": 3600
  }
}
```

**Usage:**
- Check if token is expired before each API call
- If expired, call `/api/auth/refresh` with refresh_token
- Update stored tokens with new values

## Patient Management

### Create or Get Patient

**POST** `/api/patients`

Create a new patient or get existing patient by code.

**Request Body:**
```json
{
  "patient_code": "P12345",
  "encrypted_name": "encrypted_patient_name_here"
}
```

**Response:**
```json
{
  "success": true,
  "patient": {
    "id": "uuid",
    "patient_code": "P12345",
    "encrypted_name": "encrypted_patient_name_here",
    "doctor_id": "uuid",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

## Recording Management

### Upload Audio Recording

**POST** `/api/recordings/upload`

Upload an audio recording for a patient.

**Request Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Request Body (multipart/form-data):**
- `audio`: Audio file (M4A format recommended)
- `patient_id`: UUID of the patient
- `recording_metadata`: JSON string with metadata

**Metadata JSON:**
```json
{
  "duration_seconds": 120,
  "recorded_at": "2024-01-01T12:00:00Z",
  "device_info": {
    "model": "Samsung Galaxy S10+",
    "os": "Android 13"
  }
}
```

**Response:**
```json
{
  "success": true,
  "recording": {
    "id": "uuid",
    "patient_id": "uuid",
    "doctor_id": "uuid",
    "file_path": "uploads/doctor_id/recording_id.m4a",
    "file_size_bytes": 1234567,
    "duration_seconds": 120,
    "status": "pending",
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

**Status Values:**
- `pending`: Uploaded, waiting for transcription
- `processing`: Currently being transcribed
- `completed`: Transcription finished
- `failed`: Transcription failed

### Transcribe Recording

**POST** `/api/recordings/{recording_id}/transcribe`

Trigger Whisper API transcription for a recording.

**Request Body (optional):**
```json
{
  "language": "fr",
  "prompt": "Medical transcription in French"
}
```

**Response:**
```json
{
  "success": true,
  "recording": {
    "id": "uuid",
    "status": "completed",
    ...
  },
  "transcription": {
    "transcript": "Full transcription text here...",
    "language": "fr",
    "confidence": 0.95,
    "cost": 0.012,
    "processingTimeMs": 5420
  }
}
```

### List Recordings

**GET** `/api/recordings?limit=50&offset=0&status=completed&patient_id=uuid`

Get list of recordings for authenticated doctor.

**Query Parameters:**
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (pending, processing, completed, failed)
- `patient_id` (optional): Filter by patient

**Response:**
```json
{
  "recordings": [
    {
      "id": "uuid",
      "patient_id": "uuid",
      "patient_code": "P12345",
      "file_path": "uploads/...",
      "duration_seconds": 120,
      "status": "completed",
      "transcription_id": "uuid",
      "final_transcript": "Transcription text...",
      "whisper_confidence_score": 0.95,
      "processing_method": "whisper",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### Get Recording Details

**GET** `/api/recordings/{recording_id}`

Get detailed information about a specific recording.

**Response:**
```json
{
  "success": true,
  "recording": {
    "id": "uuid",
    "patient_id": "uuid",
    "patient_code": "P12345",
    "doctor_id": "uuid",
    "file_path": "uploads/...",
    "file_size_bytes": 1234567,
    "duration_seconds": 120,
    "status": "completed",
    "recording_metadata": {
      "device_info": {...}
    },
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:05:00Z"
  },
  "transcription": {
    "id": "uuid",
    "final_transcript": "Full transcription...",
    "whisper_transcript": "Full transcription...",
    "whisper_confidence_score": 0.95,
    "whisper_language": "fr",
    "processing_method": "whisper",
    "processing_time_ms": 5420,
    "whisper_api_cost_usd": 0.012,
    "created_at": "2024-01-01T12:05:00Z"
  }
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "message": "Error description"
}
```

**Common HTTP Status Codes:**
- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Missing or invalid authentication
- `403`: Forbidden - Access denied (wrong scope or permissions)
- `404`: Not Found - Resource doesn't exist
- `409`: Conflict - Resource conflict (e.g., already processing)
- `500`: Internal Server Error - Server-side error

## Flutter App Implementation Example

```dart
class XinoteApi {
  final String baseUrl = 'https://xinote.amega.one';
  String? accessToken;
  String? refreshToken;
  DateTime? tokenExpiresAt;

  // Login
  Future<void> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      accessToken = data['session']['access_token'];
      refreshToken = data['session']['refresh_token'];
      tokenExpiresAt = DateTime.fromMillisecondsSinceEpoch(
        data['session']['expires_at'] * 1000
      );

      // Store tokens securely
      await _secureStorage.write(key: 'access_token', value: accessToken);
      await _secureStorage.write(key: 'refresh_token', value: refreshToken);
    }
  }

  // Check and refresh token
  Future<void> ensureValidToken() async {
    if (tokenExpiresAt == null || DateTime.now().isAfter(tokenExpiresAt!)) {
      await refreshAccessToken();
    }
  }

  // Upload recording
  Future<Map<String, dynamic>> uploadRecording(
    File audioFile,
    String patientId,
    Map<String, dynamic> metadata,
  ) async {
    await ensureValidToken();

    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/recordings/upload'),
    );

    request.headers['Authorization'] = 'Bearer $accessToken';
    request.files.add(await http.MultipartFile.fromPath('audio', audioFile.path));
    request.fields['patient_id'] = patientId;
    request.fields['recording_metadata'] = jsonEncode(metadata);

    final response = await request.send();
    final responseBody = await response.stream.bytesToString();

    return jsonDecode(responseBody);
  }
}
```

## Testing with curl

### Login
```bash
curl -X POST https://xinote.amega.one/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@xinote.local","password":"SecurePass123!"}'
```

### Upload Recording
```bash
curl -X POST https://xinote.amega.one/api/recordings/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "audio=@recording.m4a" \
  -F "patient_id=PATIENT_UUID" \
  -F 'recording_metadata={"duration_seconds":120}'
```

### Transcribe
```bash
curl -X POST https://xinote.amega.one/api/recordings/RECORDING_ID/transcribe \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language":"fr"}'
```
