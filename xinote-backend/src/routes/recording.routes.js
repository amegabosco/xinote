/**
 * Recording Routes
 * API endpoints for managing audio recordings
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const db = require('../db/connection');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/v1/recordings/upload
 * Upload a new audio recording
 */
router.post('/upload', upload.single('audio_file'), async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { patient_id, exam_datetime, device_info, metadata } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No audio file provided' }
      });
    }

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PATIENT_ID', message: 'patient_id is required' }
      });
    }

    logger.info('[Upload] Starting recording upload', {
      doctorId,
      patientId: patient_id,
      fileSize: req.file.size,
      filename: req.file.originalname
    });

    // Parse metadata if it's a string
    const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    const parsedDeviceInfo = typeof device_info === 'string' ? JSON.parse(device_info) : device_info;

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${doctorId}/${timestamp}_${req.file.originalname}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('xinote-recordings')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      logger.error('[Upload] Supabase upload failed', uploadError);
      return res.status(500).json({
        success: false,
        error: { code: 'UPLOAD_FAILED', message: uploadError.message }
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('xinote-recordings')
      .getPublicUrl(filename);

    // Insert recording into database
    const recordingQuery = `
      INSERT INTO recordings (
        doctor_id, patient_id, audio_file_url, storage_path,
        file_size_bytes, duration_seconds, exam_datetime, exam_type,
        device_info, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING id, created_at
    `;

    const result = await db.query(recordingQuery, [
      doctorId,
      patient_id,
      urlData.publicUrl,
      filename,
      req.file.size,
      parsedMetadata?.duration_seconds || null,
      exam_datetime,
      parsedMetadata?.exam_type || 'general',
      JSON.stringify(parsedDeviceInfo),
      'pending'
    ]);

    const recording = result.rows[0];

    logger.info('[Upload] Recording saved successfully', {
      recordingId: recording.id,
      doctorId,
      patientId: patient_id
    });

    res.status(201).json({
      success: true,
      data: {
        recording_id: recording.id,
        audio_file_url: urlData.publicUrl,
        created_at: recording.created_at,
        status: 'pending'
      }
    });

  } catch (error) {
    logger.error('[Upload] Failed to upload recording', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: { code: 'UPLOAD_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/v1/recordings
 * Get all recordings for the authenticated doctor
 */
router.get('/', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { limit = 50, offset = 0, status, patient_id } = req.query;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    let query = `
      SELECT
        r.*,
        p.patient_code,
        p.encrypted_name as patient_name,
        t.final_transcript,
        t.processing_method,
        t.whisper_confidence_score,
        t.local_confidence_score,
        (SELECT COUNT(*) FROM report_metadata WHERE recording_id = r.id) as report_count
      FROM recordings r
      LEFT JOIN patients p ON r.patient_id = p.id
      LEFT JOIN transcriptions t ON r.id = t.recording_id
      WHERE r.doctor_id = $1
    `;

    const params = [doctorId];
    let paramIndex = 2;

    if (status) {
      query += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (patient_id) {
      query += ` AND r.patient_id = $${paramIndex}`;
      params.push(patient_id);
      paramIndex++;
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: {
        recordings: result.rows,
        count: result.rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    logger.error('[GET] Failed to fetch recordings', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/v1/recordings/:id
 * Get a specific recording by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { id } = req.params;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    const query = `
      SELECT
        r.*,
        p.patient_code,
        p.encrypted_name as patient_name,
        p.age,
        p.gender,
        p.medical_history,
        t.id as transcript_id,
        t.final_transcript,
        t.processing_method,
        t.whisper_confidence_score,
        t.local_confidence_score,
        t.whisper_transcript,
        t.local_transcript,
        t.local_chunks,
        t.medical_terms_detected,
        t.medical_flags,
        t.anatomical_terms,
        t.medication_mentions,
        t.processing_time_ms,
        t.transcription_completed_at,
        COALESCE(
          json_agg(
            json_build_object(
              'report_id', rm.report_id,
              'status', rm.generation_status,
              'pdf_url', rm.pdf_url,
              'ai_extraction_data', rm.ai_extraction_data,
              'requested_at', rm.requested_at,
              'completed_at', rm.completed_at
            )
          ) FILTER (WHERE rm.report_id IS NOT NULL),
          '[]'
        ) as reports
      FROM recordings r
      LEFT JOIN patients p ON r.patient_id = p.id
      LEFT JOIN transcriptions t ON r.id = t.recording_id
      LEFT JOIN report_metadata rm ON r.id = rm.recording_id
      WHERE r.id = $1 AND r.doctor_id = $2
      GROUP BY r.id, p.patient_code, p.encrypted_name, p.age, p.gender, p.medical_history,
               t.id, t.final_transcript, t.processing_method, t.whisper_confidence_score,
               t.local_confidence_score, t.whisper_transcript, t.local_transcript,
               t.local_chunks, t.medical_terms_detected, t.medical_flags,
               t.anatomical_terms, t.medication_mentions, t.processing_time_ms,
               t.transcription_completed_at
    `;

    const result = await db.query(query, [id, doctorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording not found' }
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('[GET] Failed to fetch recording', {
      error: error.message,
      recordingId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/v1/recordings/:id/transcribe
 * Trigger transcription for a recording
 */
router.post('/:id/transcribe', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { id } = req.params;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    // Verify recording belongs to doctor
    const checkQuery = await db.query(
      'SELECT id, status FROM recordings WHERE id = $1 AND doctor_id = $2',
      [id, doctorId]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording not found' }
      });
    }

    // Update status to processing
    await db.query(
      'UPDATE recordings SET status = $1 WHERE id = $2',
      ['processing', id]
    );

    logger.info('[Transcribe] Transcription started', {
      recordingId: id,
      doctorId
    });

    // TODO: Trigger actual transcription service (Whisper API)
    // For now, return success
    res.status(202).json({
      success: true,
      message: 'Transcription started',
      data: {
        recording_id: id,
        status: 'processing'
      }
    });

  } catch (error) {
    logger.error('[Transcribe] Failed to start transcription', {
      error: error.message,
      recordingId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: { code: 'TRANSCRIBE_ERROR', message: error.message }
    });
  }
});

/**
 * DELETE /api/v1/recordings/:id
 * Delete a recording
 */
router.delete('/:id', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { id } = req.params;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    // Get recording details
    const recordingQuery = await db.query(
      'SELECT storage_path FROM recordings WHERE id = $1 AND doctor_id = $2',
      [id, doctorId]
    );

    if (recordingQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording not found' }
      });
    }

    const storagePath = recordingQuery.rows[0].storage_path;

    // Delete from storage
    if (storagePath) {
      const { error: deleteError } = await supabase.storage
        .from('xinote-recordings')
        .remove([storagePath]);

      if (deleteError) {
        logger.warn('[Delete] Failed to delete from storage', deleteError);
      }
    }

    // Delete from database (cascading will handle related records)
    await db.query('DELETE FROM recordings WHERE id = $1', [id]);

    logger.info('[Delete] Recording deleted', {
      recordingId: id,
      doctorId
    });

    res.status(200).json({
      success: true,
      message: 'Recording deleted successfully'
    });

  } catch (error) {
    logger.error('[Delete] Failed to delete recording', {
      error: error.message,
      recordingId: req.params.id
    });

    res.status(500).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message }
    });
  }
});

module.exports = router;
