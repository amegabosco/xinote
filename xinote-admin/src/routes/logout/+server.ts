import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// Clear session cookie
	cookies.delete('sb-access-token', { path: '/' });

	throw redirect(303, '/login');
};
