/**
 * Health Check Routes
 * API endpoints for service health monitoring
 */

const express = require('express');
const router = express.Router();
const db = require('../db/connection');

/**
 * GET /api/v1/health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    // Test database connection
    await db.query('SELECT 1');

    res.status(200).json({
      success: true,
      service: 'xinote-api',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'xinote-api',
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

module.exports = router;
