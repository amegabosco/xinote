import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 3000
	},
	build: {
		rollupOptions: {
			external: ['form-data']
		}
	},
	ssr: {
		noExternal: [],
		external: ['form-data']
	}
});