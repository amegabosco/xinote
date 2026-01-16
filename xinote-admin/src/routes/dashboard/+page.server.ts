import { redirect } from '@sveltejs/kit';
import { getAuthenticatedDoctor } from '$lib/server/auth';
import { query } from '$lib/server/db';

export const load = async (event: any) => {
	// Check if doctor is authenticated
	const doctor = await getAuthenticatedDoctor(event);

	if (!doctor) {
		throw redirect(303, '/login');
	}

	// Pagination parameters
	const url = new URL(event.request.url);
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '20');
	const offset = (page - 1) * limit;

	// Get total count for pagination
	const countResult = await query(`
		SELECT COUNT(*) as total
		FROM recordings r
		WHERE r.doctor_id = $1
	`, [doctor.id]);
	const totalRecordings = parseInt(countResult[0]?.total || '0');
	const totalPages = Math.ceil(totalRecordings / limit);

	// Fetch recordings for this doctor with pagination
	const recordings = await query(`
		SELECT
			r.*,
			p.patient_code,
			p.encrypted_name as patient_name,
			p.age,
			p.gender,
			p.medical_history,
			t.id as transcript_id,
			t.final_transcript,
			t.processing_method,
			t.whisper_confidence_score,
			t.local_confidence_score,
			t.whisper_transcript,
			t.local_transcript,
			t.medical_terms_detected,
			t.medical_flags,
			t.anatomical_terms,
			t.medication_mentions,
			t.processing_time_ms,
			t.transcription_completed_at,
			(SELECT COUNT(*) FROM report_metadata WHERE recording_id = r.id) as report_count
		FROM recordings r
		LEFT JOIN patients p ON r.patient_id = p.id
		LEFT JOIN transcriptions t ON r.id = t.recording_id
		WHERE r.doctor_id = $1
		ORDER BY r.created_at DESC
		LIMIT $2 OFFSET $3
	`, [doctor.id, limit, offset]);

	// Get summary statistics
	const stats = await query(`
		SELECT
			COUNT(*) as total_recordings,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_recordings,
			COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_recordings,
			COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_recordings,
			COUNT(DISTINCT patient_id) as total_patients
		FROM recordings
		WHERE doctor_id = $1
	`, [doctor.id]);

	return {
		doctor: {
			id: doctor.id,
			full_name: doctor.full_name,
			email: doctor.email,
			structure: doctor.structure,
			specialization: doctor.specialization
		},
		recordings,
		stats: stats[0] || {
			total_recordings: 0,
			completed_recordings: 0,
			pending_recordings: 0,
			failed_recordings: 0,
			total_patients: 0
		},
		pagination: {
			currentPage: page,
			totalPages,
			totalRecordings,
			limit,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1
		}
	};
};
