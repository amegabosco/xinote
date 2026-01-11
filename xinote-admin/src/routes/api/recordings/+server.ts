/**
 * Recordings List Endpoint
 * GET /api/recordings
 *
 * Returns list of recordings for authenticated doctor
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest, verifyScope } from '$lib/server/auth';
import { supabaseAdmin } from '$lib/server/supabase';

export const GET: RequestHandler = async (event) => {
	// Authenticate request
	const doctorId = await authenticateRequest(event);
	await verifyScope(doctorId, 'view', event);

	// Get query parameters
	const url = new URL(event.request.url);
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const status = url.searchParams.get('status');
	const patientId = url.searchParams.get('patient_id');

	// Build query
	let query = supabaseAdmin
		.from('recordings')
		.select(
			`
			*,
			patient:patients(id, patient_code),
			transcription:transcriptions(
				id,
				final_transcript,
				processing_method,
				cloud_confidence_score,
				created_at
			)
		`,
			{ count: 'exact' }
		)
		.eq('doctor_id', doctorId)
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	// Apply filters
	if (status) {
		query = query.eq('status', status);
	}

	if (patientId) {
		query = query.eq('patient_id', patientId);
	}

	const { data: recordings, error: dbError, count } = await query;

	if (dbError) {
		console.error('Database error:', dbError);
		throw error(500, `Failed to fetch recordings: ${dbError.message}`);
	}

	return json({
		recordings: recordings || [],
		total: count || 0,
		limit,
		offset
	});
};
