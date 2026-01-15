# Xinote Admin Dashboard API
## Complete Backend Implementation

**Date:** 2026-01-15
**Status:** ✅ Backend Complete - Ready for Frontend Integration
**Version:** 1.0.0

---

## 🎉 What's Implemented

### Backend API Endpoints (100% Complete)

✅ **Analytics API** - 7 endpoints for statistics and metrics
✅ **Audit Logs API** - 4 endpoints for compliance tracking
✅ **User Management API** - 6 endpoints for doctor administration
✅ **System Monitoring API** - 5 endpoints for health and performance

**Total:** 22 new API endpoints ready for use!

---

## 📋 Table of Contents

1. [Analytics API](#analytics-api)
2. [Audit Logs API](#audit-logs-api)
3. [User Management API](#user-management-api)
4. [System Monitoring API](#system-monitoring-api)
5. [Quick Start](#quick-start)
6. [Authentication](#authentication)
7. [Error Handling](#error-handling)

---

## Analytics API

**Base URL:** `/api/v1/analytics`

### 1. Get System Overview

**Endpoint:** `GET /api/v1/analytics/overview`

**Description:** Get overall system statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDoctors": 45,
    "totalPatients": 1250,
    "totalRecordings": 3500,
    "totalTranscriptions": 3200,
    "totalReports": 2800
  }
}
```

---

### 2. Get Doctor Activity

**Endpoint:** `GET /api/v1/analytics/doctors`

**Query Parameters:**
- `range` (optional): Time range - `7d`, `30d`, `90d` (default: `7d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "7d",
    "activity": {
      "doctor-uuid-1": 45,
      "doctor-uuid-2": 32,
      "doctor-uuid-3": 28
    }
  }
}
```

---

### 3. Get Recording Trends

**Endpoint:** `GET /api/v1/analytics/trends`

**Query Parameters:**
- `range` (optional): `7d`, `30d`, `90d` (default: `30d`)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "trends": {
      "2026-01-01": {
        "count": 25,
        "totalDuration": 18000,
        "completed": 23,
        "error": 2
      },
      "2026-01-02": {
        "count": 30,
        "totalDuration": 21600,
        "completed": 28,
        "error": 2
      }
    }
  }
}
```

---

### 4. Get Report Statistics

**Endpoint:** `GET /api/v1/analytics/reports`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 2800,
    "completed": 2650,
    "processing": 10,
    "error": 140,
    "avgAiTime": 4500,
    "avgPdfTime": 2300
  }
}
```

---

### 5. Get Storage Statistics

**Endpoint:** `GET /api/v1/analytics/storage`

**Response:**
```json
{
  "success": true,
  "data": {
    "audioStorageBytes": 52428800000,
    "pdfStorageBytes": 2097152000,
    "totalStorageBytes": 54525952000,
    "audioStorageMB": 50000.0,
    "pdfStorageMB": 2000.0,
    "totalStorageMB": 52000.0
  }
}
```

---

### 6. Get Top Doctors

**Endpoint:** `GET /api/v1/analytics/top-doctors`

**Query Parameters:**
- `limit` (optional): Number of doctors to return (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "doctors": [
      {
        "doctor_id": "uuid",
        "full_name": "Dr. Jean Dupont",
        "email": "jean.dupont@example.com",
        "recording_count": 245
      }
    ],
    "count": 10
  }
}
```

---

### 7. Health Check

**Endpoint:** `GET /api/v1/analytics/health`

**Response:**
```json
{
  "success": true,
  "service": "analytics",
  "status": "healthy",
  "timestamp": "2026-01-15T10:30:00Z"
}
```

---

## Audit Logs API

**Base URL:** `/api/v1/audit-logs`

### 1. Get Audit Logs (with filtering)

**Endpoint:** `GET /api/v1/audit-logs`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)
- `doctor_id` (optional): Filter by doctor UUID
- `action` (optional): Filter by action type
- `success` (optional): Filter by success status (`true`/`false`)
- `start_date` (optional): Filter from date (ISO 8601)
- `end_date` (optional): Filter to date (ISO 8601)

**Example:** `GET /api/v1/audit-logs?page=1&limit=20&action=report_generate&success=false`

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "doctor_id": "uuid",
        "action": "report_generate",
        "resource_type": "report",
        "resource_id": "R-01151530-A5B2C6",
        "timestamp": "2026-01-15T10:30:00Z",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "success": false,
        "error_message": "Transcription not available",
        "doctors": {
          "full_name": "Dr. Jean Dupont",
          "email": "jean.dupont@example.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 450,
      "totalPages": 23
    }
  }
}
```

---

### 2. Get Available Actions

**Endpoint:** `GET /api/v1/audit-logs/actions`

**Response:**
```json
{
  "success": true,
  "data": {
    "actions": [
      "login",
      "logout",
      "recording_upload",
      "recording_view",
      "recording_delete",
      "patient_create",
      "report_generate",
      "report_view",
      "report_download"
    ],
    "count": 9
  }
}
```

---

### 3. Get Audit Log Statistics

**Endpoint:** `GET /api/v1/audit-logs/stats`

**Query Parameters:**
- `start_date` (optional): Start date
- `end_date` (optional): End date

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 5000,
    "successful": 4750,
    "failed": 250,
    "byAction": {
      "login": {
        "total": 1200,
        "successful": 1180,
        "failed": 20
      },
      "report_generate": {
        "total": 800,
        "successful": 760,
        "failed": 40
      }
    }
  }
}
```

---

### 4. Get Single Audit Log Detail

**Endpoint:** `GET /api/v1/audit-logs/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "doctor_id": "uuid",
    "action": "report_generate",
    "resource_type": "report",
    "resource_id": "R-01151530-A5B2C6",
    "timestamp": "2026-01-15T10:30:00Z",
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "success": true,
    "details": {},
    "doctors": {
      "full_name": "Dr. Jean Dupont",
      "email": "jean.dupont@example.com",
      "structure": "Hôpital Don Bosco"
    }
  }
}
```

---

## User Management API

**Base URL:** `/api/v1/users`

### 1. Get All Doctors

**Endpoint:** `GET /api/v1/users`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Search by name or email
- `is_active` (optional): Filter by active status (`true`/`false`)
- `specialization` (optional): Filter by specialization

**Example:** `GET /api/v1/users?page=1&limit=20&search=dupont&is_active=true`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "jean.dupont@example.com",
        "full_name": "Dr. Jean Dupont",
        "structure": "Hôpital Don Bosco",
        "specialization": "Radiologie",
        "phone": "+33612345678",
        "is_active": true,
        "created_at": "2025-01-01T00:00:00Z",
        "last_login_at": "2026-01-15T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 2. Get Doctor Detail

**Endpoint:** `GET /api/v1/users/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "jean.dupont@example.com",
    "full_name": "Dr. Jean Dupont",
    "structure": "Hôpital Don Bosco",
    "specialization": "Radiologie",
    "phone": "+33612345678",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z",
    "last_login_at": "2026-01-15T09:00:00Z",
    "stats": {
      "totalRecordings": 245,
      "totalPatients": 120,
      "totalReports": 200
    }
  }
}
```

---

### 3. Update Doctor

**Endpoint:** `PUT /api/v1/users/:id`

**Allowed Fields:**
- `full_name`
- `structure`
- `specialization`
- `phone`
- `is_active`
- `settings`

**Request Body:**
```json
{
  "full_name": "Dr. Jean Dupont-Martin",
  "phone": "+33698765432",
  "specialization": "Radiologie interventionnelle"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "jean.dupont@example.com",
    "full_name": "Dr. Jean Dupont-Martin",
    "phone": "+33698765432",
    "specialization": "Radiologie interventionnelle",
    "updated_at": "2026-01-15T10:30:00Z"
  }
}
```

---

### 4. Delete/Deactivate Doctor

**Endpoint:** `DELETE /api/v1/users/:id`

**Query Parameters:**
- `hard_delete` (optional): Set to `true` for permanent deletion (default: soft delete)

**Soft Delete (Default):**
```bash
DELETE /api/v1/users/uuid
```

**Hard Delete:**
```bash
DELETE /api/v1/users/uuid?hard_delete=true
```

**Response:**
```json
{
  "success": true,
  "message": "User deactivated"
}
```

---

### 5. Activate Doctor

**Endpoint:** `POST /api/v1/users/:id/activate`

**Response:**
```json
{
  "success": true,
  "message": "User activated",
  "data": {
    "id": "uuid",
    "is_active": true,
    "updated_at": "2026-01-15T10:30:00Z"
  }
}
```

---

### 6. Get Doctor Activity

**Endpoint:** `GET /api/v1/users/:id/activity`

**Query Parameters:**
- `limit` (optional): Number of activities to return (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "activity": [
      {
        "id": "uuid",
        "action": "report_generate",
        "timestamp": "2026-01-15T10:30:00Z",
        "resource_type": "report",
        "resource_id": "R-01151530-A5B2C6",
        "success": true
      }
    ],
    "count": 20
  }
}
```

---

## System Monitoring API

**Base URL:** `/api/v1/monitoring`

### 1. Get System Health

**Endpoint:** `GET /api/v1/monitoring/health`

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-15T10:30:00Z",
    "uptime": 86400,
    "services": {
      "api": "healthy",
      "database": "healthy",
      "storage": "healthy"
    }
  }
}
```

---

### 2. Get System Metrics

**Endpoint:** `GET /api/v1/monitoring/metrics`

**Response:**
```json
{
  "success": true,
  "data": {
    "cpu": {
      "count": 4,
      "model": "Intel Core i7",
      "usage": {
        "user": 1234567,
        "system": 987654
      }
    },
    "memory": {
      "total": 16777216000,
      "free": 8388608000,
      "used": 8388608000,
      "processUsage": {
        "rss": 157286400,
        "heapTotal": 104857600,
        "heapUsed": 83886080
      }
    },
    "system": {
      "platform": "linux",
      "arch": "x64",
      "hostname": "xinote-server",
      "uptime": 864000,
      "loadAvg": [1.5, 1.3, 1.2]
    },
    "process": {
      "pid": 12345,
      "uptime": 86400,
      "version": "v20.10.0",
      "memoryUsage": {
        "rss": 157286400,
        "heapTotal": 104857600,
        "heapUsed": 83886080
      }
    }
  }
}
```

---

### 3. Get Recent Errors

**Endpoint:** `GET /api/v1/monitoring/errors`

**Query Parameters:**
- `limit` (optional): Number of errors per type (default: 50)
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "data": {
    "auditErrors": [...],
    "recordingErrors": [...],
    "reportErrors": [...],
    "summary": {
      "totalAuditErrors": 25,
      "totalRecordingErrors": 8,
      "totalReportErrors": 12
    }
  }
}
```

---

### 4. Get Performance Statistics

**Endpoint:** `GET /api/v1/monitoring/performance`

**Query Parameters:**
- `timeRange` (optional): `1h`, `24h`, `7d` (default: `24h`)

**Response:**
```json
{
  "success": true,
  "data": {
    "timeRange": "24h",
    "performance": {
      "reports": {
        "count": 150,
        "avgAiTime": 4500,
        "avgPdfTime": 2300,
        "avgTotalTime": 8200
      },
      "transcriptions": {
        "count": 180,
        "avgProcessingTime": 12500
      }
    }
  }
}
```

---

### 5. Get Database Statistics

**Endpoint:** `GET /api/v1/monitoring/database`

**Response:**
```json
{
  "success": true,
  "data": {
    "tables": {
      "doctors": { "count": 45 },
      "patients": { "count": 1250 },
      "recordings": { "count": 3500 },
      "transcriptions": { "count": 3200 },
      "report_metadata": { "count": 2800 },
      "audit_log": { "count": 5000 }
    },
    "timestamp": "2026-01-15T10:30:00Z"
  }
}
```

---

## Quick Start

### 1. Start Backend Server

```bash
cd xinote-backend
npm run dev
```

### 2. Test Endpoints

```bash
# Analytics Overview
curl http://localhost:3000/api/v1/analytics/overview

# Audit Logs
curl http://localhost:3000/api/v1/audit-logs?limit=10

# Users List
curl http://localhost:3000/api/v1/users?page=1&limit=20

# System Health
curl http://localhost:3000/api/v1/monitoring/health
```

---

## Authentication

All endpoints require authentication (except health checks).

**Methods:**
1. **JWT Token** (recommended for frontend)
2. **API Key** (for service-to-service)
3. **Session Cookie** (for admin dashboard)

**Headers:**
```
Authorization: Bearer <jwt-token>
x-doctor-id: <doctor-uuid>
```

---

## Error Handling

All endpoints follow consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` - Missing or invalid auth
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input
- `INTERNAL_ERROR` - Server error

---

## Files Created

### Backend Services
1. **`src/services/analyticsService.js`** - Analytics logic
2. **`src/routes/analytics.routes.js`** - Analytics endpoints
3. **`src/routes/auditLogs.routes.js`** - Audit log endpoints
4. **`src/routes/users.routes.js`** - User management endpoints
5. **`src/routes/monitoring.routes.js`** - Monitoring endpoints

### Updated Files
6. **`src/server.js`** - Added new routes

---

## Next Steps: Frontend Implementation

The backend is complete! Now you can build the admin dashboard frontend using SvelteKit.

**Suggested pages:**
1. `/admin/analytics` - Dashboard with charts
2. `/admin/audit-logs` - Filterable log viewer
3. `/admin/users` - Doctor management table
4. `/admin/monitoring` - System health dashboard

**Example SvelteKit fetch:**
```javascript
// +page.server.js
export async function load({ fetch }) {
  const response = await fetch('http://localhost:3000/api/v1/analytics/overview');
  const data = await response.json();
  return { stats: data.data };
}
```

---

## Summary

✅ **22 API endpoints** ready
✅ **Full CRUD** for doctor management
✅ **Comprehensive analytics** with multiple time ranges
✅ **Audit logging** with filtering and search
✅ **System monitoring** with health checks and metrics

**Status:** Backend 100% complete! Ready for frontend integration.

---

**Questions or issues?** Check the implementation in:
- `xinote-backend/src/routes/analytics.routes.js`
- `xinote-backend/src/routes/auditLogs.routes.js`
- `xinote-backend/src/routes/users.routes.js`
- `xinote-backend/src/routes/monitoring.routes.js`
