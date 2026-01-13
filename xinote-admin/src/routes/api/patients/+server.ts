import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/server/auth';
import { supabaseAdmin } from '$lib/server/supabase';

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
		const { data: existingPatient, error: fetchError } = await supabaseAdmin
			.from('patients')
			.select('*')
			.eq('patient_code', patient_code)
			.eq('doctor_id', doctorId)
			.single();

		if (fetchError && fetchError.code !== 'PGRST116') {
			// PGRST116 = no rows returned, which is fine
			console.error('[POST /api/patients] Database fetch error:', fetchError);
			console.error('[POST /api/patients] Error details:', JSON.stringify(fetchError, null, 2));
			return json({ error: 'Database error', details: fetchError.message }, { status: 500 });
		}

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
			console.error('[POST /api/patients] Error creating patient:', createError);
			console.error('[POST /api/patients] Create error details:', JSON.stringify(createError, null, 2));
			return json({ error: 'Failed to create patient', details: createError.message }, { status: 500 });
		}

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
