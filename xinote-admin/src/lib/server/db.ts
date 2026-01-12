/**
 * Direct PostgreSQL Database Connection
 * Bypasses Supabase's PostgREST layer for server-side operations
 */

import { Pool } from 'pg';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Parse Supabase URL to get database connection details
function parseSupabaseUrl(url: string) {
	// Supabase URL format: https://xxx.supabase.co
	// Database is accessible at: postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres
	const projectRef = url.replace('https://', '').replace('.supabase.co', '').split('.')[0];
	return {
		host: 'supabase-db', // Using Docker network name
		port: 5432,
		database: 'postgres',
		user: 'postgres',
		password: env.SUPABASE_DB_PASSWORD || env.SUPABASE_SERVICE_ROLE_KEY?.split('.')[0], // Fallback to service key
		// Set search_path to include xinote schema
		options: '-c search_path=public,xinote,extensions'
	};
}

let pool: Pool | null = null;

export function getDatabase() {
	if (!pool) {
		const config = parseSupabaseUrl(PUBLIC_SUPABASE_URL);
		pool = new Pool({
			...config,
			max: 20,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 2000,
		});

		// Handle errors
		pool.on('error', (err) => {
			console.error('Unexpected database error:', err);
		});
	}

	return pool;
}

/**
 * Execute a query with parameters
 */
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
	const db = getDatabase();
	const result = await db.query(text, params);
	return result.rows;
}

/**
 * Execute a query and return a single row
 */
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
	const rows = await query<T>(text, params);
	return rows.length > 0 ? rows[0] : null;
}

/**
 * Close the database connection pool
 */
export async function closeDatabase() {
	if (pool) {
		await pool.end();
		pool = null;
	}
}

// Export types for convenience
export * from './supabase';
