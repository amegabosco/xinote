/**
 * Health Check Endpoint
 * Used by Docker healthcheck and monitoring
 */

import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const checks: Record<string, any> = {
		status: 'healthy',
		timestamp: new Date().toISOString(),
		service: 'xinote-backend',
		version: '1.0.0'
	};

	try {
		// Test database connection
		const { data, error } = await supabaseAdmin
			.from('doctors')
			.select('count')
			.limit(1);

		checks.database = error ? 'unhealthy' : 'healthy';
		checks.database_error = error?.message;
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
