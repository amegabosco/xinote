/**
 * POST /api/recordings/[id]/generate-report
 *
 * Triggers report generation for a specific recording
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthenticatedDoctor } from '$lib/server/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'https://xinote.amega.one';

export const POST: RequestHandler = async (event) => {
	// Authenticate request
	const doctor = await getAuthenticatedDoctor(event);

	if (!doctor) {
		throw error(401, 'Unauthorized');
	}

	const recordingId = event.params.id;

	if (!recordingId) {
		throw error(400, 'Recording ID is required');
	}

	try {
		// Call backend report generation endpoint
		const response = await fetch(`${BACKEND_URL}/api/v1/reports/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-doctor-id': doctor.id
			},
			body: JSON.stringify({
				recording_id: recordingId
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw error(response.status, errorData.error?.message || 'Report generation failed');
		}

		const data = await response.json();

		return json({
			success: true,
			data: data.data
		});

	} catch (err) {
		console.error('Report generation error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, `Failed to generate report: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
