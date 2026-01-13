/**
 * Supabase Client for Browser
 * Used for authentication in the web dashboard
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

// Lazy initialization for browser client
let _supabaseClient: ReturnType<typeof createClient> | null = null;

export const supabaseClient = new Proxy({} as ReturnType<typeof createClient>, {
	get(target, prop) {
		if (!_supabaseClient) {
			const url = env.PUBLIC_SUPABASE_URL || '';
			const anonKey = env.PUBLIC_SUPABASE_ANON_KEY || '';
			if (!url || !anonKey) {
				throw new Error('Supabase URL and anon key must be set');
			}
			_supabaseClient = createClient(url, anonKey);
		}
		return (_supabaseClient as any)[prop];
	}
});
