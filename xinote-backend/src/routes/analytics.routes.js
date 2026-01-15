/**
 * Analytics Routes
 * API endpoints for admin dashboard statistics and metrics
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

/**
 * GET /api/v1/analytics/overview
 * Get overall system statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const stats = await analyticsService.getSystemStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[API] Failed to get overview stats', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'STATS_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/doctors
 * Get doctor activity statistics
 */
router.get('/doctors', async (req, res) => {
  try {
    const timeRange = req.query.range || '7d';
    const activity = await analyticsService.getDoctorActivity(timeRange);

    return res.status(200).json({
      success: true,
      data: {
        timeRange,
        activity,
      },
    });
  } catch (error) {
    logger.error('[API] Failed to get doctor activity', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'DOCTOR_STATS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/trends
 * Get recording trends over time
 */
router.get('/trends', async (req, res) => {
  try {
    const timeRange = req.query.range || '30d';
    const trends = await analyticsService.getRecordingTrends(timeRange);

    return res.status(200).json({
      success: true,
      data: {
        timeRange,
        trends,
      },
    });
  } catch (error) {
    logger.error('[API] Failed to get recording trends', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'TRENDS_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/reports
 * Get report generation statistics
 */
router.get('/reports', async (req, res) => {
  try {
    const stats = await analyticsService.getReportStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[API] Failed to get report stats', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_STATS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/storage
 * Get storage usage statistics
 */
router.get('/storage', async (req, res) => {
  try {
    const stats = await analyticsService.getStorageStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[API] Failed to get storage stats', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'STORAGE_STATS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/top-doctors
 * Get most active doctors
 */
router.get('/top-doctors', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const doctors = await analyticsService.getTopDoctors(limit);

    return res.status(200).json({
      success: true,
      data: {
        doctors,
        count: doctors.length,
      },
    });
  } catch (error) {
    logger.error('[API] Failed to get top doctors', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'TOP_DOCTORS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/analytics/health
 * Health check for analytics service
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'analytics',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
