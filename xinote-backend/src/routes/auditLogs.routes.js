/**
 * Audit Logs Routes
 * API endpoints for viewing and managing audit logs
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/v1/audit-logs
 * Get audit logs with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      doctor_id,
      action,
      start_date,
      end_date,
      success,
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('audit_log')
      .select('*, doctors(full_name, email)', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (action) query = query.eq('action', action);
    if (success !== undefined) query = query.eq('success', success === 'true');
    if (start_date) query = query.gte('timestamp', start_date);
    if (end_date) query = query.lte('timestamp', end_date);

    const { data, error, count } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: {
        logs: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('[API] Failed to fetch audit logs', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUDIT_LOGS_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/audit-logs/actions
 * Get list of all available actions
 */
router.get('/actions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('action')
      .limit(1000);

    if (error) throw error;

    const uniqueActions = [...new Set(data.map(log => log.action))];

    return res.status(200).json({
      success: true,
      data: {
        actions: uniqueActions.sort(),
        count: uniqueActions.length,
      },
    });
  } catch (error) {
    logger.error('[API] Failed to fetch actions', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'ACTIONS_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/audit-logs/stats
 * Get audit log statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase.from('audit_log').select('action, success, timestamp');

    if (start_date) query = query.gte('timestamp', start_date);
    if (end_date) query = query.lte('timestamp', end_date);

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total: data.length,
      successful: data.filter(log => log.success).length,
      failed: data.filter(log => log.success === false).length,
      byAction: {},
    };

    // Group by action
    data.forEach(log => {
      if (!stats.byAction[log.action]) {
        stats.byAction[log.action] = {
          total: 0,
          successful: 0,
          failed: 0,
        };
      }
      stats.byAction[log.action].total++;
      if (log.success) {
        stats.byAction[log.action].successful++;
      } else {
        stats.byAction[log.action].failed++;
      }
    });

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[API] Failed to get audit stats', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUDIT_STATS_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/audit-logs/:id
 * Get single audit log detail
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('audit_log')
      .select('*, doctors(full_name, email, structure)')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'AUDIT_LOG_NOT_FOUND',
          message: 'Audit log not found',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    logger.error('[API] Failed to fetch audit log detail', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUDIT_LOG_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

module.exports = router;
