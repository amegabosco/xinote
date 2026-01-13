import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/server/auth';
import { supabaseAdmin } from '$lib/server/supabase';

export const POST: RequestHandler = async (event) => {
	try {
		// Authenticate request - returns doctorId string or throws error
		const doctorId = await authenticateRequest(event);

		const { patient_code, encrypted_name } = await event.request.json();

		// Validate required fields
		if (!patient_code || !encrypted_name) {
			return json(
				{ error: 'Missing required fields: patient_code and encrypted_name' },
				{ status: 400 }
			);
		}

		// Check if patient already exists for this doctor
		const { data: existingPatient, error: fetchError } = await supabaseAdmin
			.from('patients')
			.select('*')
			.eq('patient_code', patient_code)
			.eq('doctor_id', doctorId)
			.single();

		if (fetchError && fetchError.code !== 'PGRST116') {
			// PGRST116 = no rows returned, which is fine
			console.error('Error fetching patient:', fetchError);
			return json({ error: 'Database error' }, { status: 500 });
		}

		// If patient exists, return it
		if (existingPatient) {
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
		const { data: newPatient, error: createError } = await supabaseAdmin
			.from('patients')
			.insert({
				doctor_id: doctorId,
				patient_code: patient_code,
				encrypted_name: encrypted_name
			})
			.select()
			.single();

		if (createError) {
			console.error('Error creating patient:', createError);
			return json({ error: 'Failed to create patient' }, { status: 500 });
		}

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
		console.error('Unexpected error in /api/patients:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
