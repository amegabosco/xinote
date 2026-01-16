import { redirect, error } from '@sveltejs/kit';
import { getAuthenticatedDoctor } from '$lib/server/auth';
import { query, queryOne } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Check if doctor is authenticated
	const doctor = await getAuthenticatedDoctor(event);

	if (!doctor) {
		throw redirect(303, '/login');
	}

	const recordingId = event.params.id;

	// Fetch recording with all related data
	const recording = await queryOne(`
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
			t.local_chunks,
			t.medical_terms_detected,
			t.medical_flags,
			t.anatomical_terms,
			t.medication_mentions,
			t.processing_time_ms,
			t.transcription_completed_at
		FROM recordings r
		LEFT JOIN patients p ON r.patient_id = p.id
		LEFT JOIN transcriptions t ON r.id = t.recording_id
		WHERE r.id = $1 AND r.doctor_id = $2
	`, [recordingId, doctor.id]);

	if (!recording) {
		throw error(404, 'Recording not found');
	}

	// Fetch associated reports
	const reports = await query(`
		SELECT
			report_id,
			generation_status,
			pdf_url,
			pdf_file_size_bytes,
			pdf_storage_path,
			ai_extraction_data,
			requested_at,
			completed_at,
			total_generation_time_ms,
			error_message,
			report_version
		FROM report_metadata
		WHERE recording_id = $1
		ORDER BY requested_at DESC
	`, [recordingId]);

	return {
		doctor: {
			id: doctor.id,
			full_name: doctor.full_name,
			email: doctor.email
		},
		recording,
		reports
	};
};