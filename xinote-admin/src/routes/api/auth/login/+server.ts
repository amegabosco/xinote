/**
 * POST /api/auth/login
 *
 * Mobile app login endpoint
 * Authenticates doctor with email/password and returns Supabase session token
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseAdmin } from '$lib/server/supabase';
import { query } from '$lib/server/db';

export const POST: RequestHandler = async (event) => {
	try {
		const body = await event.request.json();
		const { email, password } = body;

		if (!email || !password) {
			throw error(400, 'Email and password are required');
		}

		// Authenticate with Supabase
		const { data, error: authError } = await supabaseAdmin.auth.signInWithPassword({
			email,
			password
		});

		if (authError || !data.user || !data.session) {
			throw error(401, 'Invalid email or password');
		}

		// Verify this user is a doctor
		const doctors = await query(
			`SELECT id, email, full_name, specialization, structure FROM doctors WHERE id = $1 AND is_active = true`,
			[data.user.id]
		);

		if (!doctors || doctors.length === 0) {
			throw error(403, 'Account not authorized as doctor');
		}

		const doctor = doctors[0];

		// Return session token and doctor info
		return json({
			success: true,
			session: {
				access_token: data.session.access_token,
				refresh_token: data.session.refresh_token,
				expires_at: data.session.expires_at,
				expires_in: data.session.expires_in
			},
			doctor: {
				id: doctor.id,
				email: doctor.email,
				full_name: doctor.full_name,
				specialization: doctor.specialization,
				structure: doctor.structure
			}
		});
	} catch (err) {
		console.error('Login error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Login failed');
	}
};
