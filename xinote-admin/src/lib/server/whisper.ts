/**
 * Whisper Transcription Service
 * Uses OpenAI Whisper API to transcribe audio recordings
 */

import { query } from './db';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

// Get API key from environment (runtime, not build time)
const getApiKey = () => process.env.OPENAI_API_KEY || '';

// Get full path to recording file
const getRecordingPath = (doctorId: string, filePath: string): string => {
	const uploadsDir = process.env.UPLOAD_DIR || '/app/uploads';
	return path.join(uploadsDir, filePath);
};

interface WhisperResponse {
	text: string;
	language?: string;
	duration?: number;
}

interface TranscriptionResult {
	success: boolean;
	transcript?: string;
	language?: string;
	confidence?: number;
	error?: string;
	cost?: number;
	processingTimeMs?: number;
}

/**
 * Transcribe an audio file using OpenAI Whisper API
 */
export async function transcribeWithWhisper(
	audioFilePath: string,
	options: {
		language?: string;
		prompt?: string;
		temperature?: number;
		model?: string;
	} = {}
): Promise<TranscriptionResult> {
	const startTime = Date.now();

	try {
		// Check if file exists
		if (!fs.existsSync(audioFilePath)) {
			return {
				success: false,
				error: 'Audio file not found'
			};
		}

		// Get file stats for cost calculation
		const fileStats = fs.statSync(audioFilePath);
		const fileSizeBytes = fileStats.size;
		const fileSizeMB = fileSizeBytes / (1024 * 1024);

		// Create form data
		const formData = new FormData();
		formData.append('file', fs.createReadStream(audioFilePath));
		formData.append('model', options.model || 'whisper-1');

		// Optional parameters
		if (options.language) {
			formData.append('language', options.language);
		}
		if (options.prompt) {
			formData.append('prompt', options.prompt);
		}
		if (options.temperature !== undefined) {
			formData.append('temperature', options.temperature.toString());
		}

		// Check API key
		const apiKey = getApiKey();
		if (!apiKey) {
			return {
				success: false,
				error: 'OpenAI API key not configured'
			};
		}

		// Make API request
		const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				...formData.getHeaders()
			},
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Whisper API error:', errorText);
			return {
				success: false,
				error: `Whisper API error: ${response.status} ${response.statusText}`
			};
		}

		const result: WhisperResponse = await response.json();
		const processingTimeMs = Date.now() - startTime;

		// Calculate cost (OpenAI charges $0.006 per minute)
		// Estimate duration based on file size (rough estimate: 1MB ≈ 1 minute for M4A)
		const estimatedMinutes = fileSizeMB;
		const cost = estimatedMinutes * 0.006;

		return {
			success: true,
			transcript: result.text,
			language: result.language,
			confidence: 0.95, // Whisper doesn't provide confidence scores, use default
			cost,
			processingTimeMs
		};
	} catch (error) {
		console.error('Whisper transcription error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Transcribe a recording by ID
 */
export async function transcribeRecording(
	recordingId: string,
	options: {
		language?: string;
		prompt?: string;
	} = {}
): Promise<TranscriptionResult> {
	try {
		// Get recording details
		const recordings = await query(
			`SELECT * FROM recordings WHERE id = $1`,
			[recordingId]
		);

		if (!recordings || recordings.length === 0) {
			return {
				success: false,
				error: 'Recording not found'
			};
		}

		const recording = recordings[0];

		// Update status to processing
		await query(
			`UPDATE recordings SET status = 'processing', updated_at = NOW() WHERE id = $1`,
			[recordingId]
		);

		// Get file path
		const audioFilePath = getRecordingPath(recording.doctor_id, recording.file_path);

		// Start transcription timestamp
		const transcriptionStartedAt = new Date();

		// Transcribe with Whisper
		const result = await transcribeWithWhisper(audioFilePath, {
			language: options.language || 'fr', // Default to French for medical context
			prompt: options.prompt || 'Transcription médicale en français.'
		});

		if (!result.success) {
			// Update recording status to failed
			await query(
				`UPDATE recordings SET status = 'failed', updated_at = NOW() WHERE id = $1`,
				[recordingId]
			);

			return result;
		}

		// Check if transcription already exists
		const existingTranscriptions = await query(
			`SELECT id FROM transcriptions WHERE recording_id = $1`,
			[recordingId]
		);

		const transcriptionCompletedAt = new Date();

		if (existingTranscriptions && existingTranscriptions.length > 0) {
			// Update existing transcription
			await query(
				`UPDATE transcriptions
				SET
					whisper_transcript = $1,
					whisper_confidence_score = $2,
					whisper_language = $3,
					final_transcript = $1,
					processing_method = 'whisper',
					transcription_started_at = $4,
					transcription_completed_at = $5,
					processing_time_ms = $6,
					whisper_api_cost_usd = $7
				WHERE recording_id = $8`,
				[
					result.transcript,
					result.confidence || 0.95,
					result.language || 'fr',
					transcriptionStartedAt,
					transcriptionCompletedAt,
					result.processingTimeMs,
					result.cost,
					recordingId
				]
			);
		} else {
			// Create new transcription
			await query(
				`INSERT INTO transcriptions (
					recording_id,
					whisper_transcript,
					whisper_confidence_score,
					whisper_language,
					final_transcript,
					processing_method,
					transcription_started_at,
					transcription_completed_at,
					processing_time_ms,
					whisper_api_cost_usd
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
				[
					recordingId,
					result.transcript,
					result.confidence || 0.95,
					result.language || 'fr',
					result.transcript,
					'whisper',
					transcriptionStartedAt,
					transcriptionCompletedAt,
					result.processingTimeMs,
					result.cost
				]
			);
		}

		// Update recording status to completed
		await query(
			`UPDATE recordings SET status = 'completed', updated_at = NOW() WHERE id = $1`,
			[recordingId]
		);

		return result;
	} catch (error) {
		console.error('Error transcribing recording:', error);

		// Update recording status to failed
		await query(
			`UPDATE recordings SET status = 'failed', updated_at = NOW() WHERE id = $1`,
			[recordingId]
		);

		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}
