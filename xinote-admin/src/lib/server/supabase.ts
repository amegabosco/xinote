/**
 * Supabase Server Client
 * For server-side operations with service role access
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { env } from '$env/dynamic/private';

// Client for authenticated operations (RLS enabled)
export const supabaseClient = createClient(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY,
	{
		db: { schema: 'xinote' }
	}
);

// Admin client for service operations (bypasses RLS)
// Lazy initialization to avoid build-time errors
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
	get(target, prop) {
		if (!_supabaseAdmin) {
			if (!env.SUPABASE_SERVICE_ROLE_KEY) {
				throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
			}
			_supabaseAdmin = createClient(
				PUBLIC_SUPABASE_URL,
				env.SUPABASE_SERVICE_ROLE_KEY,
				{
					db: { schema: 'xinote' },
					auth: {
						autoRefreshToken: false,
						persistSession: false
					}
				}
			);
		}
		return (_supabaseAdmin as any)[prop];
	}
});

/**
 * Database types for Xinote schema
 */
export interface Doctor {
	id: string;
	email: string;
	full_name: string;
	structure?: string;
	specialization?: string;
	phone?: string;
	is_active: boolean;
	settings: Record<string, any>;
	created_at: string;
	updated_at: string;
}

export interface Patient {
	id: string;
	doctor_id: string;
	encrypted_name: string;
	encrypted_age?: string;
	encrypted_gender?: string;
	encrypted_medical_history?: string;
	patient_code: string;
	last_consultation_at?: string;
	tags: string[];
	created_at: string;
	updated_at: string;
}

export interface Recording {
	id: string;
	doctor_id: string;
	patient_id?: string;
	audio_file_path: string;
	file_size_bytes: number;
	duration_seconds?: number;
	audio_format: string;
	exam_datetime: string;
	exam_type?: string;
	status: 'pending' | 'processing' | 'completed' | 'failed' | 'deleted';
	metadata?: Record<string, any>;
	device_info?: string;
	audio_quality_score?: number;
	background_noise_level?: 'low' | 'medium' | 'high';
	notes?: string;
	tags: string[];
	created_at: string;
	updated_at: string;
}

export interface Transcription {
	id: string;
	recording_id: string;
	local_transcript?: string;
	local_confidence_score?: number;
	local_language?: string;
	local_chunks?: any;
	cloud_transcript?: string;
	cloud_confidence_score?: number;
	cloud_language?: string;
	whisper_model?: string;
	final_transcript?: string;
	processing_method?: 'local_only' | 'cloud_only' | 'hybrid';
	medical_terms_detected?: string[];
	word_count?: number;
	processing_time_ms?: number;
	whisper_api_cost_usd?: number;
	created_at: string;
	updated_at: string;
}

/**
 * Helper to get doctor by ID
 */
export async function getDoctorById(doctorId: string): Promise<Doctor | null> {
	const { data, error } = await supabaseAdmin
		.from('doctors')
		.select('*')
		.eq('id', doctorId)
		.single();

	if (error) {
		console.error('Error fetching doctor:', error);
		return null;
	}

	return data;
}

/**
 * Helper to create audit log entry
 */
export async function logAuditEvent(params: {
	doctor_id: string;
	action: string;
	resource_type?: string;
	resource_id?: string;
	ip_address?: string;
	user_agent?: string;
	details?: Record<string, any>;
	success?: boolean;
	error_message?: string;
}) {
	const { error } = await supabaseAdmin.from('audit_log').insert({
		doctor_id: params.doctor_id,
		action: params.action,
		resource_type: params.resource_type,
		resource_id: params.resource_id,
		ip_address: params.ip_address,
		user_agent: params.user_agent,
		details: params.details || {},
		success: params.success ?? true,
		error_message: params.error_message
	});

	if (error) {
		console.error('Failed to log audit event:', error);
	}
}
