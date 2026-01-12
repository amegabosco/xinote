import { redirect } from '@sveltejs/kit';
import { getAuthenticatedDoctor } from '$lib/server/auth';
import { query } from '$lib/server/db';

export const load = async (event: any) => {
	// Check if doctor is authenticated
	const doctor = await getAuthenticatedDoctor(event);

	if (!doctor) {
		throw redirect(303, '/login');
	}

	// Fetch recordings for this doctor
	const recordings = await query(`
		SELECT
			r.*,
			p.patient_code,
			p.encrypted_name as patient_name,
			t.final_transcript,
			t.processing_method,
			t.cloud_confidence_score
		FROM recordings r
		LEFT JOIN patients p ON r.patient_id = p.id
		LEFT JOIN transcriptions t ON r.id = t.recording_id
		WHERE r.doctor_id = $1
		ORDER BY r.created_at DESC
		LIMIT 50
	`, [doctor.id]);

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
		}
	};
};
