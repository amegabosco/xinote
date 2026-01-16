/**
 * Authentication Routes
 * API endpoints for user authentication
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
 * POST /api/v1/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Email and password are required'
        }
      });
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.warn('[Auth] Login failed', { email, error: error.message });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    logger.info('[Auth] Login successful', { email, userId: data.user.id });

    res.status(200).json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: {
          id: data.user.id,
          email: data.user.email,
          doctor_id: data.user.id
        }
      }
    });

  } catch (error) {
    logger.error('[Auth] Login error', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'An error occurred during login'
      }
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      logger.warn('[Auth] Token refresh failed', { error: error.message });
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token'
        }
      });
    }

    logger.info('[Auth] Token refreshed', { userId: data.user.id });

    res.status(200).json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    logger.error('[Auth] Refresh error', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'REFRESH_ERROR',
        message: 'An error occurred during token refresh'
      }
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(200).json({
        success: true,
        message: 'Logged out'
      });
    }

    const token = authHeader.substring(7);
    await supabase.auth.admin.signOut(token);

    logger.info('[Auth] Logout successful');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('[Auth] Logout error', { error: error.message });
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: 'An error occurred during logout'
      }
    });
  }
});

module.exports = router;
