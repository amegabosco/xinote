# Xinote Report Generation System
## Comprehensive Documentation

**Created:** 2026-01-15
**Status:** Backend Complete, Flutter Integration Pending
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Implementation](#backend-implementation)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Configuration](#configuration)
7. [Flutter Integration Guide](#flutter-integration-guide)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Future Enhancements](#future-enhancements)

---

## Overview

The Xinote Report Generation System automatically creates professional PDF medical reports from audio recordings and transcriptions using:

- **AI-Powered Content Extraction** (OpenAI GPT-4)
- **Professional PDF Generation** (Puppeteer)
- **Secure Cloud Storage** (Supabase Storage)
- **GDPR-Compliant Audit Logging**

### Key Features

✅ Automatic report generation after transcription
✅ AI extraction of observations, analysis, and conclusions
✅ Professional A4 PDF format matching medical standards
✅ Secure storage with access control
✅ Real-time status tracking
✅ Mobile app integration ready

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Report Generation Flow                    │
└─────────────────────────────────────────────────────────────┘

Mobile App (Flutter)
    ↓
    POST /api/v1/reports/generate
    {recording_id: "uuid"}
    ↓
Backend Service (Node.js)
    ↓
    ├─→ 1. Fetch Recording + Transcription + Patient Data (Supabase)
    │
    ├─→ 2. AI Content Extraction (OpenAI GPT-4)
    │   • Parse transcription
    │   • Extract observations (bullet points)
    │   • Generate analysis summary
    │   • Generate medical conclusion
    │
    ├─→ 3. PDF Generation (Puppeteer)
    │   • Load HTML template
    │   • Inject data (patient, exam, AI content)
    │   • Render to A4 PDF
    │
    ├─→ 4. Upload to Supabase Storage
    │   • Path: {doctor_id}/{report_id}.pdf
    │   • Bucket: xinote-reports
    │
    ├─→ 5. Update Database (report_metadata)
    │   • Status: completed
    │   • PDF URL, size, processing times
    │
    └─→ 6. Return to Mobile App
        • report_id
        • pdf_url
        • status
    ↓
Mobile App Downloads & Displays PDF
```

---

## Backend Implementation

### File Structure

```
xinote-backend/
├── src/
│   ├── services/
│   │   ├── aiExtractionService.js      # GPT-4 content extraction
│   │   ├── pdfGeneratorService.js      # PDF generation with Puppeteer
│   │   └── reportGeneratorService.js   # Main orchestration service
│   ├── routes/
│   │   └── report.routes.js            # API endpoints
│   └── server.js                       # Updated with report routes
├── .env                                # Environment variables
└── .env.example                        # Environment template
```

### Services Overview

#### 1. AI Extraction Service (`aiExtractionService.js`)

**Purpose:** Extract structured medical content from transcriptions using GPT-4

**Key Functions:**
- `extractMedicalContent(transcription, examType, language)`
- Returns: `{observations, analysis_summary, medical_conclusion, extracted_medical_terms}`

**Configuration:**
- Model: GPT-4
- Temperature: 0.3 (low for medical accuracy)
- Response Format: JSON
- Language Support: French (default), English

**Prompt Strategy:**
- System prompt: Medical assistant role definition
- User prompt: Structured extraction request with transcription
- JSON schema enforcement for consistent output

#### 2. PDF Generator Service (`pdfGeneratorService.js`)

**Purpose:** Generate professional A4 PDF reports from structured data

**Key Functions:**
- `generatePDF(reportData)`
- Returns: PDF Buffer

**Technology:**
- Puppeteer (headless Chrome)
- HTML/CSS template rendering
- A4 format with proper margins
- Print-optimized styling

**Template Features:**
- Professional header with branding
- Patient information grid
- Exam observations in table format
- Highlighted analysis and conclusion boxes
- Footer with metadata (hospital, doctor, dates)
- Pagination support

#### 3. Report Generator Service (`reportGeneratorService.js`)

**Purpose:** Main orchestration service coordinating all steps

**Key Functions:**
- `generateReport(recordingId, doctorId)` - Main generation flow
- `getReportStatus(reportId)` - Check report status
- `getDoctorReports(doctorId, limit)` - List doctor's reports
- `generateReportId()` - Generate unique report ID (R-MMDDHHMM-XXXXXX)

**Process Flow:**
1. Fetch recording + transcription + patient data from Supabase
2. Create report_metadata record (status: processing)
3. Call AI extraction service
4. Call PDF generator service
5. Upload PDF to Supabase Storage
6. Update report_metadata (status: completed)
7. Log audit event
8. Return report metadata

---

## API Endpoints

### Base URL: `/api/v1/reports`

---

### 1. Generate Report

**Endpoint:** `POST /api/v1/reports/generate`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <token>
x-doctor-id: <doctor_uuid>
```

**Request Body:**
```json
{
  "recording_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "report_id": "R-01151530-A5B2C6",
    "pdf_url": "https://supabase.co/storage/v1/object/public/xinote-reports/doctor-id/R-01151530-A5B2C6.pdf",
    "status": "completed",
    "processing_time_ms": 8500,
    "pdf_size_bytes": 145678
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "MISSING_RECORDING_ID",
    "message": "recording_id is required"
  }
}
```

---

### 2. Get Report Status

**Endpoint:** `GET /api/v1/reports/:reportId/status`

**Example:** `GET /api/v1/reports/R-01151530-A5B2C6/status`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "report_id": "R-01151530-A5B2C6",
    "status": "completed",
    "pdf_url": "https://...",
    "pdf_size_bytes": 145678,
    "requested_at": "2026-01-15T15:30:00Z",
    "completed_at": "2026-01-15T15:30:08Z",
    "processing_time_ms": 8500,
    "error_message": null
  }
}
```

**Status Values:**
- `processing` - Report is being generated
- `completed` - Report ready for download
- `error` - Generation failed (see error_message)
- `cancelled` - Generation was cancelled

---

### 3. List Doctor's Reports

**Endpoint:** `GET /api/v1/reports`

**Query Parameters:**
- `limit` (optional): Number of reports to return (default: 50, max: 100)
- `status` (optional): Filter by status (processing|completed|error)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "report_id": "R-01151530-A5B2C6",
        "recording_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "completed",
        "pdf_url": "https://...",
        "pdf_size_bytes": 145678,
        "requested_at": "2026-01-15T15:30:00Z",
        "completed_at": "2026-01-15T15:30:08Z",
        "processing_time_ms": 8500
      }
    ],
    "count": 1
  }
}
```

---

### 4. Download Report PDF

**Endpoint:** `GET /api/v1/reports/:reportId/download`

**Example:** `GET /api/v1/reports/R-01151530-A5B2C6/download`

**Response:** Redirects to PDF URL or returns 403 if unauthorized

**Security:** Verifies doctor owns the report before allowing download

---

## Database Schema

### Table: `xinote.report_metadata`

```sql
CREATE TABLE xinote.report_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id VARCHAR(50) UNIQUE NOT NULL,          -- R-MMDDHHMM-XXXXXX
    recording_id UUID NOT NULL REFERENCES recordings(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    patient_id UUID REFERENCES patients(id),

    -- PDF storage
    pdf_url TEXT,
    pdf_file_size_bytes BIGINT,
    pdf_storage_path TEXT,

    -- Generation status
    generation_status TEXT DEFAULT 'processing'      -- processing|completed|error|cancelled
        CHECK (generation_status IN ('processing', 'completed', 'error', 'cancelled')),

    -- AI extraction results
    ai_extraction_data JSONB,                        -- {observations, analysis_summary, medical_conclusion}

    -- Performance metrics
    ai_processing_time_ms INTEGER,
    pdf_generation_time_ms INTEGER,
    total_generation_time_ms INTEGER,

    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Error tracking
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_report_metadata_recording ON report_metadata(recording_id);
CREATE INDEX idx_report_metadata_doctor ON report_metadata(doctor_id);
CREATE INDEX idx_report_metadata_status ON report_metadata(generation_status);
CREATE INDEX idx_report_metadata_report_id ON report_metadata(report_id);
```

### Row-Level Security (RLS)

```sql
-- Doctors can only view their own reports
CREATE POLICY "Doctors can view their own reports"
    ON report_metadata FOR SELECT
    USING (doctor_id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role can manage reports"
    ON report_metadata FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');
```

---

## Configuration

### Environment Variables

**Required:**

```bash
# OpenAI API
OPENAI_API_KEY=sk-proj-...                         # Your OpenAI API key

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co             # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...              # Service role key (not anon key!)

# Report Generation
REPORT_STORAGE_BUCKET=xinote-reports               # Supabase storage bucket name
```

**Optional:**

```bash
GPT_MODEL=gpt-4                                     # AI model (default: gpt-4)
GPT_TEMPERATURE=0.3                                 # Creativity (0-1, lower = more deterministic)
WHISPER_LANGUAGE=fr                                 # Default language for transcription
```

### Supabase Storage Setup

1. **Create Storage Bucket:**
```sql
-- In Supabase Dashboard → Storage → Create bucket
Bucket name: xinote-reports
Public: false (private access only)
```

2. **Set Bucket Policies:**
```sql
-- Allow authenticated users to read their own reports
CREATE POLICY "Doctors can read their own reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'xinote-reports' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Service role can upload/manage all reports
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
USING (
  bucket_id = 'xinote-reports' AND
  auth.role() = 'service_role'
);
```

---

## Flutter Integration Guide

### Step 1: Create Report Generator Service

```dart
// lib/services/report_generator_service.dart

import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'xinote_api_service.dart';

class ReportGeneratorService {

  /// Request report generation for a recording
  static Future<ReportMetadata> generateReport(String recordingId) async {
    try {
      final response = await XinoteApiService.post(
        '/reports/generate',
        body: {'recording_id': recordingId}
      );

      if (response['success']) {
        return ReportMetadata.fromJson(response['data']);
      } else {
        throw Exception(response['error']['message']);
      }
    } catch (e) {
      throw Exception('Failed to generate report: $e');
    }
  }

  /// Check report generation status
  static Future<ReportMetadata> getReportStatus(String reportId) async {
    try {
      final response = await XinoteApiService.get('/reports/$reportId/status');

      if (response['success']) {
        return ReportMetadata.fromJson(response['data']);
      } else {
        throw Exception(response['error']['message']);
      }
    } catch (e) {
      throw Exception('Failed to get report status: $e');
    }
  }

  /// Download report PDF to local storage
  static Future<File> downloadReport(String reportId, String pdfUrl) async {
    try {
      final response = await http.get(Uri.parse(pdfUrl));

      if (response.statusCode == 200) {
        final dir = await getApplicationDocumentsDirectory();
        final reportsDir = Directory('${dir.path}/reports');

        if (!await reportsDir.exists()) {
          await reportsDir.create(recursive: true);
        }

        final file = File('${reportsDir.path}/$reportId.pdf');
        await file.writeAsBytes(response.bodyBytes);

        return file;
      } else {
        throw Exception('Failed to download PDF: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Failed to download report: $e');
    }
  }

  /// Get all reports for current doctor
  static Future<List<ReportMetadata>> getDoctorReports({int limit = 50}) async {
    try {
      final response = await XinoteApiService.get('/reports?limit=$limit');

      if (response['success']) {
        final reports = (response['data']['reports'] as List)
            .map((json) => ReportMetadata.fromJson(json))
            .toList();
        return reports;
      } else {
        throw Exception(response['error']['message']);
      }
    } catch (e) {
      throw Exception('Failed to fetch reports: $e');
    }
  }
}
```

### Step 2: Create Report Metadata Model

```dart
// lib/models/report_metadata.dart

class ReportMetadata {
  final String reportId;
  final String recordingId;
  final String status; // processing, completed, error
  final String? pdfUrl;
  final int? pdfSizeBytes;
  final DateTime requestedAt;
  final DateTime? completedAt;
  final int? processingTimeMs;
  final String? errorMessage;

  ReportMetadata({
    required this.reportId,
    required this.recordingId,
    required this.status,
    this.pdfUrl,
    this.pdfSizeBytes,
    required this.requestedAt,
    this.completedAt,
    this.processingTimeMs,
    this.errorMessage,
  });

  factory ReportMetadata.fromJson(Map<String, dynamic> json) {
    return ReportMetadata(
      reportId: json['report_id'],
      recordingId: json['recording_id'],
      status: json['status'],
      pdfUrl: json['pdf_url'],
      pdfSizeBytes: json['pdf_size_bytes'],
      requestedAt: DateTime.parse(json['requested_at']),
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'])
          : null,
      processingTimeMs: json['processing_time_ms'],
      errorMessage: json['error_message'],
    );
  }

  bool get isCompleted => status == 'completed';
  bool get isProcessing => status == 'processing';
  bool get hasError => status == 'error';

  String get statusDisplay {
    switch (status) {
      case 'processing':
        return 'Génération en cours...';
      case 'completed':
        return 'Rapport prêt';
      case 'error':
        return 'Erreur';
      default:
        return status;
    }
  }
}
```

### Step 3: Add UI Button to Generate Report

```dart
// In ReportDetailScreen or RecordingDetailScreen

FloatingActionButton(
  onPressed: _generateReport,
  backgroundColor: Colors.blue,
  child: _isGenerating
      ? SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(
            color: Colors.white,
            strokeWidth: 2,
          ),
        )
      : Icon(Icons.picture_as_pdf),
  tooltip: 'Générer le rapport PDF',
)

// Handler method
Future<void> _generateReport() async {
  setState(() => _isGenerating = true);

  try {
    // Request report generation
    final report = await ReportGeneratorService.generateReport(
      widget.recording.id
    );

    // Show success message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Rapport généré avec succès!'),
        backgroundColor: Colors.green,
        action: SnackBarAction(
          label: 'Voir',
          textColor: Colors.white,
          onPressed: () => _viewReport(report),
        ),
      ),
    );

    // Optionally auto-download and view
    await _viewReport(report);

  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Erreur: $e'),
        backgroundColor: Colors.red,
      ),
    );
  } finally {
    setState(() => _isGenerating = false);
  }
}

Future<void> _viewReport(ReportMetadata report) async {
  if (!report.isCompleted || report.pdfUrl == null) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Le rapport n\'est pas encore prêt')),
    );
    return;
  }

  try {
    // Download PDF
    final pdfFile = await ReportGeneratorService.downloadReport(
      report.reportId,
      report.pdfUrl!
    );

    // Open PDF viewer (requires pdf_viewer or open_file package)
    await OpenFile.open(pdfFile.path);

  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Erreur lors de l\'ouverture du PDF: $e')),
    );
  }
}
```

### Step 4: Add Dependencies

```yaml
# pubspec.yaml

dependencies:
  http: ^1.2.1
  path_provider: ^2.1.4
  open_file: ^3.3.2        # To open PDF files
  # OR
  flutter_pdfview: ^1.3.2  # To view PDF in-app
```

---

## Testing

### Backend Testing

#### 1. Test AI Extraction Service

```bash
cd xinote-backend
node -e "require('./src/services/aiExtractionService').testExtraction()"
```

#### 2. Test PDF Generation Service

```bash
node -e "require('./src/services/pdfGeneratorService').testPDFGeneration()"
```

#### 3. Test Full Report Generation

```bash
# Using curl
curl -X POST http://localhost:3000/api/v1/reports/generate \
  -H "Content-Type: application/json" \
  -H "x-doctor-id: YOUR_DOCTOR_UUID" \
  -d '{"recording_id": "YOUR_RECORDING_UUID"}'
```

### Expected Processing Times

- AI Extraction: 2-5 seconds
- PDF Generation: 1-3 seconds
- Storage Upload: 1-2 seconds
- **Total:** ~5-10 seconds per report

---

## Deployment

### Prerequisites

1. **Supabase Project Setup:**
   - Create project at supabase.com
   - Run migration: `database/migrations/003_add_report_metadata.sql`
   - Create storage bucket: `xinote-reports`
   - Configure RLS policies

2. **Environment Variables:**
   - Set all required env vars in production
   - Use secrets management (AWS Secrets Manager, etc.)

3. **Dependencies:**
   - Ensure Puppeteer can run in production environment
   - For Docker: install Chrome dependencies
   - For serverless: use Puppeteer Lambda layer

### Docker Deployment

```dockerfile
# Add to Dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Production Considerations

- **Rate Limiting:** Implement rate limits on report generation (e.g., 10 reports/hour per doctor)
- **Queueing:** For high volume, use job queue (Bull, BullMQ) instead of synchronous processing
- **Caching:** Cache AI results to avoid re-processing same transcriptions
- **Monitoring:** Track generation times, error rates, and costs
- **Cost Management:** Monitor OpenAI API usage (GPT-4 is expensive)

---

## Future Enhancements

### Short-term (Next Sprint)

1. **Email Delivery**
   - Auto-send PDF to doctor's email after generation
   - Support patient email sharing (with consent)
   - Use SendGrid or Resend API

2. **Report Templates**
   - Multiple template styles (formal, simplified, bilingual)
   - Hospital branding customization
   - Letterhead and logo support

3. **Batch Generation**
   - Generate reports for multiple recordings at once
   - Progress tracking UI
   - Export as ZIP archive

### Medium-term

4. **Advanced AI Features**
   - Multi-language support (English, Spanish, Arabic)
   - Medical terminology validation
   - Anomaly detection and flagging
   - Automatic ICD-10 code suggestions

5. **Report Versioning**
   - Allow doctors to edit and regenerate reports
   - Track report history and changes
   - Compare versions side-by-side

6. **Integration**
   - Export to EMR systems (HL7 FHIR format)
   - Print directly from mobile app
   - Share via secure link with expiration

### Long-term

7. **Voice Dictation**
   - Real-time report dictation during exam
   - Voice commands to edit sections
   - Hands-free workflow

8. **Analytics Dashboard**
   - Most common diagnoses by doctor
   - Average report generation time trends
   - AI accuracy metrics

---

## Cost Estimation

### Per Report

- **OpenAI GPT-4 API:** ~$0.10-0.20 (varies by transcription length)
- **Supabase Storage:** ~$0.001 (150KB PDF)
- **Compute:** Negligible on modern servers

### Monthly (100 reports)

- **AI:** ~$10-20
- **Storage:** ~$0.10
- **Total:** ~$10-25/month

### Optimization Tips

- Use GPT-3.5-turbo for less critical extractions (~10x cheaper)
- Cache AI results to avoid re-generation
- Compress PDFs for smaller storage footprint

---

## Support & Troubleshooting

### Common Issues

**1. "No transcription available for this recording"**
- Ensure Whisper transcription completed before generating report
- Check `transcriptions` table for `final_transcript`

**2. "Failed to upload PDF: bucket not found"**
- Create `xinote-reports` bucket in Supabase Storage
- Verify bucket name in `.env` matches exactly

**3. "OpenAI API error: Unauthorized"**
- Check `OPENAI_API_KEY` in `.env` is correct
- Verify API key has credits and permissions

**4. PDF generation timeout**
- Increase timeout in Puppeteer config
- Check server resources (CPU/memory)
- Ensure Chrome/Chromium is properly installed

### Debug Mode

Enable detailed logging:

```bash
LOG_LEVEL=debug npm run dev
```

---

## License & Compliance

**License:** Proprietary
**GDPR Compliance:** ✅ All patient data encrypted, audit logs enabled
**HIPAA Considerations:** Ensure BAA with OpenAI, encrypt data at rest/transit

---

## Changelog

### v1.0.0 (2026-01-15)

- ✅ Initial implementation
- ✅ AI content extraction with GPT-4
- ✅ PDF generation with Puppeteer
- ✅ Supabase Storage integration
- ✅ Complete API endpoints
- ✅ Database schema and migrations
- ✅ Documentation and testing guides

---

**For questions or support, contact the Xinote development team.**
