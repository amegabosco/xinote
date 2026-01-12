/**
 * Audio Recording Upload Endpoint
 * POST /api/recordings/upload
 *
 * Handles audio file uploads from Flutter app
 * Creates recording entry and triggers transcription
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest, getClientIP, verifyScope } from '$lib/server/auth';
import { supabaseAdmin, logAuditEvent } from '$lib/server/supabase';
import { uploadAudioFile, checkStorageQuota } from '$lib/server/storage';

export const POST: RequestHandler = async (event) => {
	let doctorId: string | null = null;

	try {
		// Authenticate request
		doctorId = await authenticateRequest(event);
		await verifyScope(doctorId, 'upload', event);

		// Parse multipart form data
		const formData = await event.request.formData();
		const audioFile = formData.get('audio_file') as File;
		const patientId = formData.get('patient_id') as string | null;
		const examType = formData.get('exam_type') as string | null;
		const examDatetime = formData.get('exam_datetime') as string;
		const deviceInfo = formData.get('device_info') as string | null;
		const notes = formData.get('notes') as string | null;
		const metadata = formData.get('metadata') as string | null;

		// Validate required fields
		if (!audioFile || !examDatetime) {
			throw error(400, 'Missing required fields: audio_file, exam_datetime');
		}

		// Validate it's actually a file
		if (!(audioFile instanceof File)) {
			throw error(400, 'audio_file must be a file');
		}

		// Check storage quota
		const hasQuota = await checkStorageQuota(doctorId, audioFile.size);
		if (!hasQuota) {
			throw error(413, 'Storage quota exceeded');
		}

		// Generate recording ID
		const recordingId = crypto.randomUUID();

		// Upload file to storage
		const { path: audioFilePath, size: fileSize } = await uploadAudioFile({
			file: audioFile,
			doctorId,
			recordingId
		});

		// Parse metadata if provided
		let parsedMetadata = {};
		if (metadata) {
			try {
				parsedMetadata = JSON.parse(metadata);
			} catch {
				console.warn('Invalid metadata JSON, ignoring');
			}
		}

		// Create recording record in database
		const { data: recording, error: dbError } = await supabaseAdmin
			.from('xinote.recordings')
			.insert({
				id: recordingId,
				doctor_id: doctorId,
				patient_id: patientId,
				audio_file_path: audioFilePath,
				file_size_bytes: fileSize,
				audio_format: audioFile.name.split('.').pop()?.toLowerCase() || 'm4a',
				exam_datetime: examDatetime,
				exam_type: examType,
				status: 'pending',
				device_info: deviceInfo,
				notes: notes,
				metadata: parsedMetadata
			})
			.select()
			.single();

		if (dbError) {
			console.error('Database error:', dbError);
			throw error(500, `Failed to create recording: ${dbError.message}`);
		}

		// Log audit event
		await logAuditEvent({
			doctor_id: doctorId,
			action: 'recording_upload',
			resource_type: 'recording',
			resource_id: recordingId,
			ip_address: getClientIP(event),
			user_agent: event.request.headers.get('user-agent'),
			details: {
				file_size: fileSize,
				file_format: audioFile.name.split('.').pop(),
				exam_type: examType
			}
		});

		// TODO: Trigger transcription job (will implement in next step)

		return json(
			{
				success: true,
				recording: {
					id: recording.id,
					status: recording.status,
					audio_file_path: recording.audio_file_path,
					file_size_bytes: recording.file_size_bytes,
					created_at: recording.created_at
				}
			},
			{ status: 201 }
		);
	} catch (err) {
		// Log failed upload attempt
		if (doctorId) {
			await logAuditEvent({
				doctor_id: doctorId,
				action: 'recording_upload',
				ip_address: getClientIP(event),
				user_agent: event.request.headers.get('user-agent'),
				success: false,
				error_message: err instanceof Error ? err.message : 'Unknown error'
			});
		}

		// Re-throw error
		throw err;
	}
};
