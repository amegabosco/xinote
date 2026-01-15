/**
 * System Monitoring Routes
 * API endpoints for system health and performance monitoring
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const os = require('os');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/v1/monitoring/health
 * Get overall system health
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'healthy',
        database: 'unknown',
        storage: 'unknown',
      },
    };

    // Check database connection
    try {
      await supabase.from('doctors').select('id').limit(1);
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Check storage (Supabase Storage)
    try {
      await supabase.storage.from('xinote-recordings').list('', { limit: 1 });
      health.services.storage = 'healthy';
    } catch (error) {
      health.services.storage = 'unhealthy';
      health.status = 'degraded';
    }

    return res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('[API] Health check failed', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/monitoring/metrics
 * Get system performance metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = {
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        usage: process.cpuUsage(),
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        processUsage: process.memoryUsage(),
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAvg: os.loadavg(),
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        version: process.version,
        memoryUsage: process.memoryUsage(),
      },
    };

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('[API] Failed to fetch metrics', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/monitoring/errors
 * Get recent errors and failures
 */
router.get('/errors', async (req, res) => {
  try {
    const { limit = 50, start_date, end_date } = req.query;

    // Get failed audit logs
    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('success', false)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (start_date) query = query.gte('timestamp', start_date);
    if (end_date) query = query.lte('timestamp', end_date);

    const { data: auditErrors, error: auditError } = await query;
    if (auditError) throw auditError;

    // Get failed recordings
    const { data: recordingErrors, error: recError } = await supabase
      .from('recordings')
      .select('*')
      .eq('status', 'error')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (recError) throw recError;

    // Get failed report generations
    const { data: reportErrors, error: repError } = await supabase
      .from('report_metadata')
      .select('*')
      .eq('generation_status', 'error')
      .order('requested_at', { ascending: false })
      .limit(parseInt(limit));

    if (repError) throw repError;

    return res.status(200).json({
      success: true,
      data: {
        auditErrors,
        recordingErrors,
        reportErrors,
        summary: {
          totalAuditErrors: auditErrors.length,
          totalRecordingErrors: recordingErrors.length,
          totalReportErrors: reportErrors.length,
        },
      },
    });
  } catch (error) {
    logger.error('[API] Failed to fetch errors', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'ERRORS_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/monitoring/performance
 * Get performance statistics
 */
router.get('/performance', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    const hoursAgo = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : 168;
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hoursAgo);

    // Get report generation performance
    const { data: reports, error: repError } = await supabase
      .from('report_metadata')
      .select('ai_processing_time_ms, pdf_generation_time_ms, total_generation_time_ms')
      .gte('requested_at', startDate.toISOString())
      .eq('generation_status', 'completed');

    if (repError) throw repError;

    // Get transcription performance
    const { data: transcriptions, error: transError } = await supabase
      .from('transcriptions')
      .select('processing_time_ms')
      .gte('created_at', startDate.toISOString());

    if (transError) throw transError;

    const performance = {
      reports: {
        count: reports.length,
        avgAiTime: reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + (r.ai_processing_time_ms || 0), 0) / reports.length) : 0,
        avgPdfTime: reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + (r.pdf_generation_time_ms || 0), 0) / reports.length) : 0,
        avgTotalTime: reports.length > 0 ? Math.round(reports.reduce((sum, r) => sum + (r.total_generation_time_ms || 0), 0) / reports.length) : 0,
      },
      transcriptions: {
        count: transcriptions.length,
        avgProcessingTime: transcriptions.length > 0 ? Math.round(transcriptions.reduce((sum, t) => sum + (t.processing_time_ms || 0), 0) / transcriptions.length) : 0,
      },
    };

    return res.status(200).json({
      success: true,
      data: {
        timeRange,
        performance,
      },
    });
  } catch (error) {
    logger.error('[API] Failed to fetch performance stats', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'PERFORMANCE_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/monitoring/database
 * Get database statistics
 */
router.get('/database', async (req, res) => {
  try {
    const tables = ['doctors', 'patients', 'recordings', 'transcriptions', 'report_metadata', 'audit_log'];
    const stats = {};

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true });

      if (error) {
        logger.warn(`[API] Failed to get count for table ${table}`, { error: error.message });
        stats[table] = { count: 0, error: error.message };
      } else {
        stats[table] = { count: count || 0 };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        tables: stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[API] Failed to fetch database stats', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_STATS_FAILED',
        message: error.message,
      },
    });
  }
});

module.exports = router;
