import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			out: 'build'
		}),
		prerender: {
			handleHttpError: 'warn',
			entries: [],
			handleMissingId: 'ignore',
			handleEntryGeneratorMismatch: 'ignore',
			handleUnseenRoutes: 'ignore'
		},
		csrf: {
			// Disable CSRF protection for API endpoints
			// API endpoints use token-based authentication (JWT/API keys) instead
			checkOrigin: false
		}
	}
};

export default config;