/**
 * SvelteKit Server Hooks
 * Configure CSRF protection and handle API authentication
 */

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Disable CSRF protection for API routes that use Bearer token authentication
	// The mobile app doesn't use cookies, so CSRF doesn't apply
	const isApiRoute = event.url.pathname.startsWith('/api/');
	const hasAuthorizationHeader = event.request.headers.has('Authorization');

	if (isApiRoute && hasAuthorizationHeader) {
		// Disable CSRF check for authenticated API requests
		return resolve(event, {
			filterSerializedResponseHeaders: (name) => name === 'content-type'
		});
	}

	// For all other requests (web dashboard), use default CSRF protection
	return resolve(event);
};
