/**
 * POST /api/auth/refresh
 *
 * Refresh an expired access token using refresh token
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';

export const POST: RequestHandler = async (event) => {
	try {
		const body = await event.request.json();
		const { refresh_token } = body;

		if (!refresh_token) {
			throw error(400, 'Refresh token is required');
		}

		// Refresh the session with Supabase
		const { data, error: refreshError } = await supabaseAdmin.auth.refreshSession({
			refresh_token
		});

		if (refreshError || !data.session) {
			throw error(401, 'Invalid or expired refresh token');
		}

		// Return new session tokens
		return json({
			success: true,
			session: {
				access_token: data.session.access_token,
				refresh_token: data.session.refresh_token,
				expires_at: data.session.expires_at,
				expires_in: data.session.expires_in
			}
		});
	} catch (err) {
		console.error('Token refresh error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Token refresh failed');
	}
};
