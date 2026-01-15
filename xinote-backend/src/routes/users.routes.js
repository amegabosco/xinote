/**
 * User Management Routes
 * API endpoints for managing doctors (admin only)
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
 * GET /api/v1/users
 * Get all doctors with pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      is_active,
      specialization,
    } = req.query;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('doctors')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Apply filters
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
    if (specialization) query = query.eq('specialization', specialization);
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: {
        users: data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    logger.error('[API] Failed to fetch users', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'USERS_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/users/:id
 * Get single doctor detail
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: doctor, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Doctor not found',
        },
      });
    }

    // Get related statistics
    const [recordings, patients, reports] = await Promise.all([
      supabase.from('recordings').select('id', { count: 'exact', head: true }).eq('doctor_id', id),
      supabase.from('patients').select('id', { count: 'exact', head: true }).eq('doctor_id', id),
      supabase.from('report_metadata').select('id', { count: 'exact', head: true }).eq('doctor_id', id),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        ...doctor,
        stats: {
          totalRecordings: recordings.count || 0,
          totalPatients: patients.count || 0,
          totalReports: reports.count || 0,
        },
      },
    });
  } catch (error) {
    logger.error('[API] Failed to fetch user detail', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'USER_FETCH_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * PUT /api/v1/users/:id
 * Update doctor information
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Allowed fields to update
    const allowedFields = ['full_name', 'structure', 'specialization', 'phone', 'is_active', 'settings'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_VALID_UPDATES',
          message: 'No valid fields to update',
        },
      });
    }

    const { data, error } = await supabase
      .from('doctors')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info('[API] User updated', { userId: id, fields: Object.keys(filteredUpdates) });

    return res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    logger.error('[API] Failed to update user', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'USER_UPDATE_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * DELETE /api/v1/users/:id
 * Delete/deactivate doctor (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    if (hard_delete === 'true') {
      // Hard delete (caution!)
      const { error } = await supabase
        .from('doctors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.warn('[API] User hard deleted', { userId: id });

      return res.status(200).json({
        success: true,
        message: 'User permanently deleted',
      });
    } else {
      // Soft delete (deactivate)
      const { data, error } = await supabase
        .from('doctors')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      logger.info('[API] User deactivated', { userId: id });

      return res.status(200).json({
        success: true,
        message: 'User deactivated',
        data: data,
      });
    }
  } catch (error) {
    logger.error('[API] Failed to delete user', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'USER_DELETE_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * POST /api/v1/users/:id/activate
 * Reactivate a deactivated doctor
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('doctors')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    logger.info('[API] User activated', { userId: id });

    return res.status(200).json({
      success: true,
      message: 'User activated',
      data: data,
    });
  } catch (error) {
    logger.error('[API] Failed to activate user', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'USER_ACTIVATE_FAILED',
        message: error.message,
      },
    });
  }
});

/**
 * GET /api/v1/users/:id/activity
 * Get doctor's recent activity
 */
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('doctor_id', id)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: {
        activity: data,
        count: data.length,
      },
    });
  } catch (error) {
    logger.error('[API] Failed to fetch user activity', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'USER_ACTIVITY_FAILED',
        message: error.message,
      },
    });
  }
});

module.exports = router;
