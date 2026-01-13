import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/server/auth';
import { query, queryOne } from '$lib/server/db';

export const POST: RequestHandler = async (event) => {
	try {
		// Authenticate request - returns doctorId string or throws SvelteKit error
		const doctorId = await authenticateRequest(event);
		console.log('[POST /api/patients] Authenticated doctorId:', doctorId);

		// Parse request body
		const body = await event.request.json();
		const { patient_code, encrypted_name } = body;
		console.log('[POST /api/patients] Request:', { patient_code, encrypted_name });

		// Validate required fields
		if (!patient_code || !encrypted_name) {
			console.log('[POST /api/patients] Missing required fields');
			return json(
				{ error: 'Missing required fields: patient_code and encrypted_name' },
				{ status: 400 }
			);
		}

		// Check if patient already exists for this doctor
		console.log('[POST /api/patients] Checking for existing patient:', { patient_code, doctor_id: doctorId });

		const existingPatient = await queryOne(
			`SELECT id, patient_code, encrypted_name, created_at
			 FROM patients
			 WHERE patient_code = $1 AND doctor_id = $2`,
			[patient_code, doctorId]
		);

		// If patient exists, return it
		if (existingPatient) {
			console.log('[POST /api/patients] Patient exists, returning:', existingPatient.id);
			return json({
				success: true,
				patient: {
					id: existingPatient.id,
					patient_code: existingPatient.patient_code,
					encrypted_name: existingPatient.encrypted_name,
					created_at: existingPatient.created_at
				}
			});
		}

		// Create new patient
		console.log('[POST /api/patients] Creating new patient');

		const newPatients = await query(
			`INSERT INTO patients (doctor_id, patient_code, encrypted_name)
			 VALUES ($1, $2, $3)
			 RETURNING id, patient_code, encrypted_name, created_at`,
			[doctorId, patient_code, encrypted_name]
		);

		if (!newPatients || newPatients.length === 0) {
			console.error('[POST /api/patients] Failed to create patient - no rows returned');
			return json({ error: 'Failed to create patient' }, { status: 500 });
		}

		const newPatient = newPatients[0];
		console.log('[POST /api/patients] Patient created successfully:', newPatient.id);

		return json({
			success: true,
			patient: {
				id: newPatient.id,
				patient_code: newPatient.patient_code,
				encrypted_name: newPatient.encrypted_name,
				created_at: newPatient.created_at
			}
		});
	} catch (err) {
		console.error('Error in /api/patients:', err);

		// Re-throw SvelteKit errors (like authentication errors)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Return generic error for unexpected errors
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
