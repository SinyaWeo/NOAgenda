// Centralized API utility for SvelteKit frontend
// Set your backend base URL here or use an environment variable
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export async function apiFetch(path: string, options: RequestInit = {}) {
	const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
	try {
		const response = await fetch(url, {
			credentials: 'include', // send cookies if needed
			...options
		});
		if (!response.ok) {
			console.error('API error:', response.status, response.statusText, url);
		}
		return response;
	} catch (err) {
		console.error('Network/API fetch error:', err, url, options);
		throw err;
	}
}
