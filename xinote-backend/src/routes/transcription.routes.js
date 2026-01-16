/**
 * Transcription Routes
 * API endpoints for managing transcriptions
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../db/connection');

/**
 * GET /api/v1/transcriptions/:recordingId
 * Get transcription for a specific recording
 */
router.get('/:recordingId', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { recordingId } = req.params;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    // Verify recording belongs to doctor
    const recordingCheck = await db.query(
      'SELECT id FROM recordings WHERE id = $1 AND doctor_id = $2',
      [recordingId, doctorId]
    );

    if (recordingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording not found' }
      });
    }

    // Get transcription
    const transcriptionQuery = `
      SELECT
        t.*,
        r.exam_type,
        r.duration_seconds,
        r.exam_datetime
      FROM transcriptions t
      JOIN recordings r ON t.recording_id = r.id
      WHERE t.recording_id = $1
    `;

    const result = await db.query(transcriptionQuery, [recordingId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NO_TRANSCRIPTION', message: 'No transcription found for this recording' }
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('[Transcription] Failed to fetch transcription', {
      error: error.message,
      recordingId: req.params.recordingId
    });

    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/v1/transcriptions
 * Create or update transcription for a recording
 */
router.post('/', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const {
      recording_id,
      final_transcript,
      local_transcript,
      whisper_transcript,
      local_confidence_score,
      whisper_confidence_score,
      processing_method,
      local_chunks,
      medical_terms_detected,
      medical_flags,
      anatomical_terms,
      medication_mentions
    } = req.body;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    if (!recording_id || !final_transcript) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_DATA', message: 'recording_id and final_transcript are required' }
      });
    }

    // Verify recording belongs to doctor
    const recordingCheck = await db.query(
      'SELECT id FROM recordings WHERE id = $1 AND doctor_id = $2',
      [recording_id, doctorId]
    );

    if (recordingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recording not found' }
      });
    }

    // Insert or update transcription
    const transcriptionQuery = `
      INSERT INTO transcriptions (
        recording_id, final_transcript, local_transcript, whisper_transcript,
        local_confidence_score, whisper_confidence_score, processing_method,
        local_chunks, medical_terms_detected, medical_flags,
        anatomical_terms, medication_mentions,
        transcription_completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (recording_id)
      DO UPDATE SET
        final_transcript = EXCLUDED.final_transcript,
        local_transcript = EXCLUDED.local_transcript,
        whisper_transcript = EXCLUDED.whisper_transcript,
        local_confidence_score = EXCLUDED.local_confidence_score,
        whisper_confidence_score = EXCLUDED.whisper_confidence_score,
        processing_method = EXCLUDED.processing_method,
        local_chunks = EXCLUDED.local_chunks,
        medical_terms_detected = EXCLUDED.medical_terms_detected,
        medical_flags = EXCLUDED.medical_flags,
        anatomical_terms = EXCLUDED.anatomical_terms,
        medication_mentions = EXCLUDED.medication_mentions,
        transcription_completed_at = NOW()
      RETURNING id
    `;

    const result = await db.query(transcriptionQuery, [
      recording_id,
      final_transcript,
      local_transcript,
      whisper_transcript,
      local_confidence_score,
      whisper_confidence_score,
      processing_method || 'hybrid',
      local_chunks ? JSON.stringify(local_chunks) : null,
      medical_terms_detected,
      medical_flags ? JSON.stringify(medical_flags) : null,
      anatomical_terms,
      medication_mentions
    ]);

    // Update recording status
    await db.query(
      'UPDATE recordings SET status = $1 WHERE id = $2',
      ['completed', recording_id]
    );

    logger.info('[Transcription] Transcription saved', {
      recordingId: recording_id,
      transcriptionId: result.rows[0].id,
      doctorId
    });

    res.status(201).json({
      success: true,
      data: {
        transcription_id: result.rows[0].id,
        recording_id,
        final_transcript,
        processing_method: processing_method || 'hybrid'
      }
    });

  } catch (error) {
    logger.error('[Transcription] Failed to save transcription', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: { code: 'SAVE_ERROR', message: error.message }
    });
  }
});

module.exports = router;
