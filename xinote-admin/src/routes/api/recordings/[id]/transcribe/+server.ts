/**
 * POST /api/recordings/[id]/transcribe
 *
 * Triggers Whisper transcription for a specific recording
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest, verifyScope } from '$lib/server/auth';
import { query as dbQuery } from '$lib/server/db';
import { transcribeRecording } from '$lib/server/whisper';

export const POST: RequestHandler = async (event) => {
	// Authenticate request
	const doctorId = await authenticateRequest(event);
	await verifyScope(doctorId, 'transcribe', event);

	const recordingId = event.params.id;

	if (!recordingId) {
		throw error(400, 'Recording ID is required');
	}

	try {
		// Verify recording belongs to this doctor
		const recordings = await dbQuery(
			`SELECT * FROM recordings WHERE id = $1 AND doctor_id = $2`,
			[recordingId, doctorId]
		);

		if (!recordings || recordings.length === 0) {
			throw error(404, 'Recording not found or access denied');
		}

		const recording = recordings[0];

		// Check if recording is in a valid state for transcription
		if (recording.status === 'processing') {
			throw error(409, 'Recording is already being processed');
		}

		// Get optional parameters from request body
		const body = await event.request.json().catch(() => ({}));
		const language = body.language || 'fr';
		const prompt = body.prompt;

		// Trigger transcription (this runs synchronously but could be made async with a queue)
		const result = await transcribeRecording(recordingId, {
			language,
			prompt
		});

		if (!result.success) {
			throw error(500, result.error || 'Transcription failed');
		}

		// Fetch updated recording with transcription
		const updatedRecordings = await dbQuery(
			`SELECT
				r.*,
				t.id as transcription_id,
				t.final_transcript,
				t.whisper_transcript,
				t.whisper_confidence_score,
				t.whisper_language,
				t.processing_method,
				t.processing_time_ms,
				t.whisper_api_cost_usd
			FROM recordings r
			LEFT JOIN transcriptions t ON r.id = t.recording_id
			WHERE r.id = $1`,
			[recordingId]
		);

		return json({
			success: true,
			recording: updatedRecordings[0],
			transcription: {
				transcript: result.transcript,
				language: result.language,
				confidence: result.confidence,
				cost: result.cost,
				processingTimeMs: result.processingTimeMs
			}
		});
	} catch (err) {
		console.error('Transcription error:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, `Failed to transcribe recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
