/**
 * Authentication utilities for API endpoints and web dashboard
 */

import { error } from '@sveltejs/kit';
import { supabaseAdmin, getDoctorById } from './supabase';
import { query, queryOne } from './db';
import type { RequestEvent } from '@sveltejs/kit';
import type { Doctor } from './supabase';

/**
 * Extract doctor ID from Authorization header
 * Supports both Bearer tokens and API keys
 */
export async function authenticateRequest(event: RequestEvent): Promise<string> {
	const authHeader = event.request.headers.get('Authorization');

	if (!authHeader) {
		throw error(401, 'Missing Authorization header');
	}

	// Check for Bearer token (Supabase JWT)
	if (authHeader.startsWith('Bearer ')) {
		const token = authHeader.substring(7);
		return await authenticateWithJWT(token);
	}

	// Check for API key format (xin_...)
	if (authHeader.startsWith('xin_')) {
		return await authenticateWithAPIKey(authHeader);
	}

	throw error(401, 'Invalid authorization format');
}

/**
 * Authenticate using Supabase JWT token
 */
async function authenticateWithJWT(token: string): Promise<string> {
	const {
		data: { user },
		error: authError
	} = await supabaseAdmin.auth.getUser(token);

	if (authError || !user) {
		throw error(401, 'Invalid or expired token');
	}

	// User ID should correspond to doctor ID in our schema
	return user.id;
}

/**
 * Authenticate using API key
 * API keys are stored hashed in the database
 */
async function authenticateWithAPIKey(apiKey: string): Promise<string> {
	// Get key prefix (first 8 chars)
	const keyPrefix = apiKey.substring(0, 8);

	// Query API keys table
	const { data: apiKeyRecord, error: keyError } = await supabaseAdmin
		.from('api_keys')
		.select('id, doctor_id, key_hash, is_active, last_used_at, scopes')
		.eq('key_prefix', keyPrefix)
		.eq('is_active', true)
		.single();

	if (keyError || !apiKeyRecord) {
		throw error(401, 'Invalid API key');
	}

	// In production, verify the full API key hash using bcrypt
	// For now, we'll use a simple comparison
	// TODO: Implement proper bcrypt verification

	// Update last used timestamp
	await supabaseAdmin
		.from('api_keys')
		.update({
			last_used_at: new Date().toISOString(),
			request_count: apiKeyRecord.request_count + 1
		})
		.eq('id', apiKeyRecord.id);

	return apiKeyRecord.doctor_id;
}

/**
 * Get client IP address from request
 */
export function getClientIP(event: RequestEvent): string | null {
	// Check common headers for proxied requests
	const forwarded = event.request.headers.get('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}

	const realIP = event.request.headers.get('x-real-ip');
	if (realIP) {
		return realIP;
	}

	// Fallback to direct connection IP
	return event.getClientAddress();
}

/**
 * Verify doctor has required scope for operation
 */
export async function verifyScope(
	doctorId: string,
	requiredScope: string,
	event: RequestEvent
): Promise<void> {
	const authHeader = event.request.headers.get('Authorization');

	// JWT tokens have full access
	if (authHeader?.startsWith('Bearer ')) {
		return;
	}

	// For API keys, check scopes
	if (authHeader?.startsWith('xin_')) {
		const keyPrefix = authHeader.substring(0, 8);
		const { data: apiKey } = await supabaseAdmin
			.from('api_keys')
			.select('scopes')
			.eq('key_prefix', keyPrefix)
			.single();

		if (!apiKey || !apiKey.scopes.includes(requiredScope)) {
			throw error(403, `Missing required scope: ${requiredScope}`);
		}
	}
}

/**
 * Get authenticated doctor from session (for web dashboard)
 * Uses Supabase session from cookies
 */
export async function getAuthenticatedDoctor(event: RequestEvent): Promise<Doctor | null> {
	// Get session from cookies (set by Supabase Auth)
	const sessionCookie = event.cookies.get('sb-access-token');

	if (!sessionCookie) {
		return null;
	}

	try {
		const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(sessionCookie);

		if (authError || !user) {
			return null;
		}

		// Get doctor record from database
		const doctor = await queryOne<Doctor>(
			'SELECT * FROM doctors WHERE id = $1 AND is_active = true',
			[user.id]
		);

		return doctor;
	} catch (err) {
		console.error('Error getting authenticated doctor:', err);
		return null;
	}
}
