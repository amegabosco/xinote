/**
 * API Key Management Service
 * Handles generation, validation, and management of API keys for doctors
 */

import { query } from './db';
import crypto from 'crypto';

// Generate a cryptographically secure random API key
function generateApiKey(): string {
	// Format: xn_live_32_random_characters
	const randomBytes = crypto.randomBytes(24);
	const randomString = randomBytes.toString('base64url').substring(0, 32);
	return `xn_live_${randomString}`;
}

// Hash API key using SHA-256 (faster than bcrypt for API keys)
function hashApiKey(apiKey: string): string {
	return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Get first 8 characters as prefix for identification
function getKeyPrefix(apiKey: string): string {
	return apiKey.substring(0, 12); // "xn_live_xxxx"
}

export interface ApiKeyInfo {
	id: string;
	key_prefix: string;
	key_name: string | null;
	created_at: string;
	last_used_at: string | null;
	expires_at: string | null;
	revoked_at: string | null;
	request_count: number;
	scopes: string[];
}

/**
 * Generate a new API key for a doctor
 */
export async function generateApiKeyForDoctor(
	doctorId: string,
	options: {
		name?: string;
		expiresInDays?: number;
		scopes?: string[];
	} = {}
): Promise<{ apiKey: string; keyInfo: ApiKeyInfo }> {
	// Generate the API key
	const apiKey = generateApiKey();
	const keyHash = hashApiKey(apiKey);
	const keyPrefix = getKeyPrefix(apiKey);

	// Calculate expiration date
	let expiresAt = null;
	if (options.expiresInDays) {
		const expirationDate = new Date();
		expirationDate.setDate(expirationDate.getDate() + options.expiresInDays);
		expiresAt = expirationDate.toISOString();
	}

	// Insert into database
	const result = await query(
		`INSERT INTO api_keys (
			doctor_id,
			key_hash,
			key_prefix,
			key_name,
			expires_at,
			scopes
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, key_prefix, key_name, created_at, last_used_at, expires_at, revoked_at, request_count, scopes`,
		[
			doctorId,
			keyHash,
			keyPrefix,
			options.name || null,
			expiresAt,
			options.scopes || ['upload', 'view', 'transcribe']
		]
	);

	const keyInfo = result[0];

	return {
		apiKey, // Only returned once!
		keyInfo
	};
}

/**
 * Validate an API key and return the associated doctor ID
 */
export async function validateApiKey(apiKey: string): Promise<{
	valid: boolean;
	doctorId?: string;
	scopes?: string[];
	keyId?: string;
}> {
	try {
		const keyHash = hashApiKey(apiKey);

		// Look up the API key
		const results = await query(
			`SELECT id, doctor_id, scopes, expires_at, revoked_at
			FROM api_keys
			WHERE key_hash = $1`,
			[keyHash]
		);

		if (!results || results.length === 0) {
			return { valid: false };
		}

		const keyRecord = results[0];

		// Check if revoked
		if (keyRecord.revoked_at) {
			return { valid: false };
		}

		// Check if expired
		if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
			return { valid: false };
		}

		// Update last_used_at and increment request_count
		await query(
			`UPDATE api_keys
			SET last_used_at = NOW(),
				request_count = request_count + 1
			WHERE id = $1`,
			[keyRecord.id]
		);

		return {
			valid: true,
			doctorId: keyRecord.doctor_id,
			scopes: keyRecord.scopes,
			keyId: keyRecord.id
		};
	} catch (error) {
		console.error('Error validating API key:', error);
		return { valid: false };
	}
}

/**
 * List all API keys for a doctor
 */
export async function listApiKeys(doctorId: string): Promise<ApiKeyInfo[]> {
	const results = await query(
		`SELECT id, key_prefix, key_name, created_at, last_used_at, expires_at, revoked_at, request_count, scopes
		FROM api_keys
		WHERE doctor_id = $1
		ORDER BY created_at DESC`,
		[doctorId]
	);

	return results || [];
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: string, doctorId: string): Promise<boolean> {
	const result = await query(
		`UPDATE api_keys
		SET revoked_at = NOW()
		WHERE id = $1 AND doctor_id = $2 AND revoked_at IS NULL
		RETURNING id`,
		[keyId, doctorId]
	);

	return result && result.length > 0;
}

/**
 * Delete an API key permanently
 */
export async function deleteApiKey(keyId: string, doctorId: string): Promise<boolean> {
	const result = await query(
		`DELETE FROM api_keys
		WHERE id = $1 AND doctor_id = $2
		RETURNING id`,
		[keyId, doctorId]
	);

	return result && result.length > 0;
}
