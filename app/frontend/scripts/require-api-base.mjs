// Run before `vite build`. VITE_API_BASE is baked into the bundle, so refuse to
// produce a production build that would silently call http://localhost:3000.
import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), '');
if (!process.env.VITE_API_BASE && !env.VITE_API_BASE) {
	console.error(
		'\nVITE_API_BASE is not set.\n' +
			'  Same origin behind the reverse proxy:  VITE_API_BASE=/api\n' +
			'  Separate API host:                     VITE_API_BASE=https://api.example.com\n'
	);
	process.exit(1);
}
