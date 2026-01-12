/**
 * File storage utilities
 * Handles audio file uploads to Supabase Storage
 */

import { supabaseAdmin } from './supabase';
import { error } from '@sveltejs/kit';

const STORAGE_BUCKET = 'xinote-recordings';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_FORMATS = ['m4a', 'mp3', 'wav', 'aac'];

/**
 * Upload audio file to Supabase Storage
 */
export async function uploadAudioFile(params: {
	file: File;
	doctorId: string;
	recordingId: string;
}): Promise<{ path: string; size: number }> {
	const { file, doctorId, recordingId } = params;

	// Validate file size
	if (file.size > MAX_FILE_SIZE) {
		throw error(413, `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
	}

	// Validate file format
	const extension = file.name.split('.').pop()?.toLowerCase();
	if (!extension || !ALLOWED_FORMATS.includes(extension)) {
		throw error(400, `Invalid file format. Allowed: ${ALLOWED_FORMATS.join(', ')}`);
	}

	// File path: {doctor_id}/{recording_id}.{extension}
	const filePath = `${doctorId}/${recordingId}.${extension}`;

	// Convert File to ArrayBuffer
	const arrayBuffer = await file.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	// Upload to Supabase Storage
	const { data, error: uploadError } = await supabaseAdmin.storage
		.from(STORAGE_BUCKET)
		.upload(filePath, uint8Array, {
			contentType: file.type || `audio/${extension}`,
			upsert: false, // Don't allow overwriting
			cacheControl: '3600'
		});

	if (uploadError) {
		console.error('Storage upload error:', uploadError);
		throw error(500, `Failed to upload file: ${uploadError.message}`);
	}

	return {
		path: data.path,
		size: file.size
	};
}

/**
 * Delete audio file from storage
 */
export async function deleteAudioFile(filePath: string): Promise<void> {
	const { error: deleteError } = await supabaseAdmin.storage
		.from(STORAGE_BUCKET)
		.remove([filePath]);

	if (deleteError) {
		console.error('Storage delete error:', deleteError);
		throw error(500, `Failed to delete file: ${deleteError.message}`);
	}
}

/**
 * Get signed URL for audio file access
 * Valid for 1 hour
 */
export async function getSignedAudioURL(filePath: string): Promise<string> {
	const { data, error: urlError } = await supabaseAdmin.storage
		.from(STORAGE_BUCKET)
		.createSignedUrl(filePath, 3600); // 1 hour

	if (urlError || !data) {
		console.error('Failed to create signed URL:', urlError);
		throw error(500, 'Failed to generate download URL');
	}

	return data.signedUrl;
}

/**
 * Calculate storage quota for doctor
 */
export async function getStorageUsage(doctorId: string): Promise<{
	used_bytes: number;
	max_bytes: number;
	percentage: number;
	recordings_count: number;
}> {
	const { data, error: quotaError } = await supabaseAdmin
		.from('xinote.storage_quotas')
		.select('*')
		.eq('doctor_id', doctorId)
		.single();

	if (quotaError || !data) {
		// Return default if no quota record exists
		return {
			used_bytes: 0,
			max_bytes: 10 * 1024 * 1024 * 1024, // 10GB default
			percentage: 0,
			recordings_count: 0
		};
	}

	const percentage = (data.used_storage_bytes / data.max_storage_bytes) * 100;

	return {
		used_bytes: data.used_storage_bytes,
		max_bytes: data.max_storage_bytes,
		percentage: Math.round(percentage * 100) / 100,
		recordings_count: data.recordings_count
	};
}

/**
 * Check if doctor has enough storage quota
 */
export async function checkStorageQuota(doctorId: string, fileSize: number): Promise<boolean> {
	const usage = await getStorageUsage(doctorId);
	return usage.used_bytes + fileSize <= usage.max_bytes;
}
