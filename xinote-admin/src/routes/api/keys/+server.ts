/**
 * API Key Management Endpoints
 *
 * GET /api/keys - List all API keys for authenticated doctor
 * POST /api/keys - Generate a new API key
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedDoctor } from '$lib/server/auth';
import { generateApiKeyForDoctor, listApiKeys } from '$lib/server/apikeys';

// GET - List all API keys
export const GET: RequestHandler = async (event) => {
	const doctor = await getAuthenticatedDoctor(event);

	if (!doctor) {
		throw error(401, 'Unauthorized');
	}

	try {
		const keys = await listApiKeys(doctor.id);

		return json({
			success: true,
			keys
		});
	} catch (err) {
		console.error('Error listing API keys:', err);
		throw error(500, 'Failed to list API keys');
	}
};

// POST - Generate a new API key
export const POST: RequestHandler = async (event) => {
	const doctor = await getAuthenticatedDoctor(event);

	if (!doctor) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await event.request.json().catch(() => ({}));

		const { name, expiresInDays, scopes } = body;

		// Validate input
		if (expiresInDays && (expiresInDays < 1 || expiresInDays > 365)) {
			throw error(400, 'Expiration must be between 1 and 365 days');
		}

		// Generate the API key
		const { apiKey, keyInfo } = await generateApiKeyForDoctor(doctor.id, {
			name,
			expiresInDays,
			scopes
		});

		return json({
			success: true,
			apiKey, // WARNING: Only shown once!
			keyInfo
		});
	} catch (err) {
		console.error('Error generating API key:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Failed to generate API key');
	}
};
