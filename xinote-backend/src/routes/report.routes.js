/**
 * Report Generation Routes
 * API endpoints for medical report generation and management
 */

const express = require('express');
const router = express.Router();
const reportGeneratorService = require('../services/reportGeneratorService');
const logger = require('../utils/logger');

/**
 * POST /api/v1/reports/generate
 * Generate a new medical report from a recording
 *
 * Body: {
 *   recording_id: string (UUID)
 * }
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   x-doctor-id: <doctorId>
 */
router.post('/generate', async (req, res) => {
  try {
    const { recording_id } = req.body;
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;

    // Validation
    if (!recording_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_RECORDING_ID',
          message: 'recording_id is required'
        }
      });
    }

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Doctor ID not found. Please authenticate.'
        }
      });
    }

    logger.info('[API] Report generation requested', {
      recordingId: recording_id,
      doctorId,
      requestId: req.id
    });

    // Generate report (async process)
    const result = await reportGeneratorService.generateReport(recording_id, doctorId);

    return res.status(201).json({
      success: true,
      data: {
        report_id: result.reportId,
        pdf_url: result.pdfUrl,
        status: result.status,
        processing_time_ms: result.processingTime,
        pdf_size_bytes: result.pdfSize
      }
    });

  } catch (error) {
    logger.error('[API] Report generation failed', {
      error: error.message,
      stack: error.stack,
      requestId: req.id
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_GENERATION_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/v1/reports/:reportId/status
 * Get report generation status
 *
 * Params:
 *   reportId: string (R-MMDDHHMM-XXXXXX)
 */
router.get('/:reportId/status', async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REPORT_ID',
          message: 'reportId is required'
        }
      });
    }

    const status = await reportGeneratorService.getReportStatus(reportId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        report_id: status.report_id,
        status: status.generation_status,
        pdf_url: status.pdf_url,
        pdf_size_bytes: status.pdf_file_size_bytes,
        requested_at: status.requested_at,
        completed_at: status.completed_at,
        processing_time_ms: status.total_generation_time_ms,
        error_message: status.error_message
      }
    });

  } catch (error) {
    logger.error('[API] Failed to get report status', {
      error: error.message,
      reportId: req.params.reportId,
      requestId: req.id
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/v1/reports
 * Get all reports for the authenticated doctor
 *
 * Query params:
 *   limit: number (default 50, max 100)
 *   status: string (processing|completed|error)
 */
router.get('/', async (req, res) => {
  try {
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Doctor ID not found. Please authenticate.'
        }
      });
    }

    const reports = await reportGeneratorService.getDoctorReports(doctorId, limit);

    return res.status(200).json({
      success: true,
      data: {
        reports: reports.map(r => ({
          report_id: r.report_id,
          recording_id: r.recording_id,
          status: r.generation_status,
          pdf_url: r.pdf_url,
          pdf_size_bytes: r.pdf_file_size_bytes,
          requested_at: r.requested_at,
          completed_at: r.completed_at,
          processing_time_ms: r.total_generation_time_ms
        })),
        count: reports.length
      }
    });

  } catch (error) {
    logger.error('[API] Failed to get doctor reports', {
      error: error.message,
      requestId: req.id
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'REPORTS_FETCH_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/v1/reports/:reportId/download
 * Download report PDF
 */
router.get('/:reportId/download', async (req, res) => {
  try {
    const { reportId } = req.params;
    const doctorId = req.headers['x-doctor-id'] || req.user?.id;

    if (!doctorId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Doctor ID not found. Please authenticate.'
        }
      });
    }

    const status = await reportGeneratorService.getReportStatus(reportId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REPORT_NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    // Security: Ensure doctor owns this report
    if (status.doctor_id !== doctorId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this report'
        }
      });
    }

    if (status.generation_status !== 'completed' || !status.pdf_url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REPORT_NOT_READY',
          message: 'Report is not yet ready for download',
          status: status.generation_status
        }
      });
    }

    // Redirect to PDF URL (or proxy download if needed)
    return res.redirect(status.pdf_url);

  } catch (error) {
    logger.error('[API] Failed to download report', {
      error: error.message,
      reportId: req.params.reportId,
      requestId: req.id
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'DOWNLOAD_FAILED',
        message: error.message
      }
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'report-generator',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
