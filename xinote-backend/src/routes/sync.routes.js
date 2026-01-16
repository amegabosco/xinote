/**
 * Sync Routes
 * API endpoints for device synchronization and notifications
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const db = require('../db/connection');

/**
 * POST /api/v1/sync/register-device
 * Register a device for push notifications
 */
router.post('/register-device', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { device_token, device_type, device_info } = req.body;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    if (!device_token) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'device_token is required' }
      });
    }

    // Store device token for push notifications
    const query = `
      INSERT INTO device_tokens (doctor_id, device_token, device_type, device_info, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (doctor_id, device_token)
      DO UPDATE SET
        device_type = EXCLUDED.device_type,
        device_info = EXCLUDED.device_info,
        updated_at = NOW(),
        is_active = true
      RETURNING id
    `;

    const result = await db.query(query, [
      doctorId,
      device_token,
      device_type || 'android',
      device_info ? JSON.stringify(device_info) : null
    ]);

    logger.info('[Sync] Device registered', {
      doctorId,
      deviceToken: device_token.substring(0, 10) + '...'
    });

    res.status(200).json({
      success: true,
      message: 'Device registered successfully',
      data: {
        device_id: result.rows[0].id
      }
    });

  } catch (error) {
    logger.error('[Sync] Failed to register device', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: { code: 'REGISTER_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/v1/sync/unregister-device
 * Unregister a device from push notifications
 */
router.post('/unregister-device', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { device_token } = req.body;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    await db.query(
      'UPDATE device_tokens SET is_active = false WHERE doctor_id = $1 AND device_token = $2',
      [doctorId, device_token]
    );

    res.status(200).json({
      success: true,
      message: 'Device unregistered successfully'
    });

  } catch (error) {
    logger.error('[Sync] Failed to unregister device', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: { code: 'UNREGISTER_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/v1/sync/pending-updates
 * Get pending updates for the device (new transcripts, reports)
 */
router.get('/pending-updates', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const { last_sync_timestamp } = req.query;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Doctor ID not found' }
      });
    }

    const lastSync = last_sync_timestamp || new Date(0).toISOString();

    // Get new transcriptions
    const transcriptionsQuery = `
      SELECT
        t.id as transcription_id,
        t.recording_id,
        t.final_transcript,
        t.processing_method,
        t.whisper_confidence_score,
        t.local_confidence_score,
        t.medical_terms_detected,
        t.transcription_completed_at,
        r.exam_type,
        r.exam_datetime,
        p.patient_code
      FROM transcriptions t
      JOIN recordings r ON t.recording_id = r.id
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE r.doctor_id = $1
        AND t.transcription_completed_at > $2
      ORDER BY t.transcription_completed_at DESC
      LIMIT 50
    `;

    const transcriptions = await db.query(transcriptionsQuery, [doctorId, lastSync]);

    // Get new reports
    const reportsQuery = `
      SELECT
        rm.report_id,
        rm.recording_id,
        rm.generation_status,
        rm.pdf_url,
        rm.pdf_file_size_bytes,
        rm.ai_extraction_data,
        rm.completed_at,
        r.exam_type,
        r.exam_datetime,
        p.patient_code
      FROM report_metadata rm
      JOIN recordings r ON rm.recording_id = r.id
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE rm.doctor_id = $1
        AND rm.completed_at > $2
        AND rm.generation_status = 'completed'
      ORDER BY rm.completed_at DESC
      LIMIT 50
    `;

    const reports = await db.query(reportsQuery, [doctorId, lastSync]);

    logger.info('[Sync] Pending updates fetched', {
      doctorId,
      transcriptionsCount: transcriptions.rows.length,
      reportsCount: reports.rows.length
    });

    res.status(200).json({
      success: true,
      data: {
        transcriptions: transcriptions.rows,
        reports: reports.rows,
        sync_timestamp: new Date().toISOString(),
        has_updates: transcriptions.rows.length > 0 || reports.rows.length > 0
      }
    });

  } catch (error) {
    logger.error('[Sync] Failed to fetch pending updates', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: { code: 'SYNC_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/v1/sync/webhook
 * Legacy webhook endpoint for n8n compatibility
 */
router.post('/webhook', async (req, res) => {
  try {
    logger.info('[Sync] Webhook received', {
      body: req.body,
      headers: req.headers
    });

    // This is a legacy endpoint - redirect to appropriate service
    res.status(200).json({
      success: true,
      message: 'Webhook received. Please use /api/v1/recordings/upload for new uploads.',
      redirect_to: '/api/v1/recordings/upload'
    });

  } catch (error) {
    logger.error('[Sync] Webhook error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: { code: 'WEBHOOK_ERROR', message: error.message }
    });
  }
});

module.exports = router;
