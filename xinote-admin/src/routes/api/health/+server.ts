/**
 * Health Check Endpoint
 * Used by Docker healthcheck and monitoring
 */

import { json } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const checks: Record<string, any> = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		service: 'xinote-backend',
		version: '1.0.0'
	};

	try {
		// Test database connection with direct PostgreSQL query
		const result = await query('SELECT COUNT(*) as count FROM doctors LIMIT 1');
		checks.database = 'healthy';
		checks.database_tables = 'accessible';
	} catch (err) {
		checks.database = 'unhealthy';
		checks.database_error = err instanceof Error ? err.message : 'Unknown error';
	}

	// Overall status
	const isHealthy = checks.database === 'healthy';
	checks.status = isHealthy ? 'healthy' : 'degraded';

	return json(checks, {
		status: isHealthy ? 200 : 503
	});
};
