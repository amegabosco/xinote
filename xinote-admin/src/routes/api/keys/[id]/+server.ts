/**
 * Individual API Key Management
 *
 * DELETE /api/keys/[id] - Revoke/delete an API key
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedDoctor } from '$lib/server/auth';
import { revokeApiKey, deleteApiKey } from '$lib/server/apikeys';

// DELETE - Revoke or delete an API key
export const DELETE: RequestHandler = async (event) => {
	const doctor = await getAuthenticatedDoctor(event);

	if (!doctor) {
		throw error(401, 'Unauthorized');
	}

	const keyId = event.params.id;

	if (!keyId) {
		throw error(400, 'API key ID is required');
	}

	try {
		// Get query parameter to determine if we should permanently delete or just revoke
		const url = new URL(event.request.url);
		const permanent = url.searchParams.get('permanent') === 'true';

		let success: boolean;

		if (permanent) {
			success = await deleteApiKey(keyId, doctor.id);
		} else {
			success = await revokeApiKey(keyId, doctor.id);
		}

		if (!success) {
			throw error(404, 'API key not found or already revoked');
		}

		return json({
			success: true,
			message: permanent ? 'API key deleted' : 'API key revoked'
		});
	} catch (err) {
		console.error('Error deleting API key:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		throw error(500, 'Failed to delete API key');
	}
};
