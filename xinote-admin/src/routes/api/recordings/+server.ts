/**
 * Recordings List Endpoint
 * GET /api/recordings
 *
 * Returns list of recordings for authenticated doctor
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest, verifyScope } from '$lib/server/auth';
import { query as dbQuery } from '$lib/server/db';

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

	try {
		// Build SQL query with filters
		let sql = `
			SELECT
				r.*,
				p.patient_code,
				t.id as transcription_id,
				t.final_transcript,
				t.processing_method,
				t.cloud_confidence_score,
				t.created_at as transcription_created_at
			FROM recordings r
			LEFT JOIN patients p ON r.patient_id = p.id
			LEFT JOIN transcriptions t ON r.id = t.recording_id
			WHERE r.doctor_id = $1
		`;

		const params: any[] = [doctorId];
		let paramIndex = 2;

		if (status) {
			sql += ` AND r.status = $${paramIndex}`;
			params.push(status);
			paramIndex++;
		}

		if (patientId) {
			sql += ` AND r.patient_id = $${paramIndex}`;
			params.push(patientId);
			paramIndex++;
		}

		sql += ` ORDER BY r.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
		params.push(limit, offset);

		// Get total count
		let countSql = `SELECT COUNT(*) as total FROM recordings WHERE doctor_id = $1`;
		const countParams: any[] = [doctorId];
		let countParamIndex = 2;

		if (status) {
			countSql += ` AND status = $${countParamIndex}`;
			countParams.push(status);
			countParamIndex++;
		}

		if (patientId) {
			countSql += ` AND patient_id = $${countParamIndex}`;
			countParams.push(patientId);
		}

		const [recordings, countResult] = await Promise.all([
			dbQuery(sql, params),
			dbQuery(countSql, countParams)
		]);

		return json({
			recordings: recordings || [],
			total: countResult[0]?.total || 0,
			limit,
			offset
		});
	} catch (err) {
		console.error('Database error:', err);
		throw error(500, `Failed to fetch recordings: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
