import { apiGetAuth } from '#lib/api.js';
import type { Project } from '#lib/types.js';

/** id -> name of the projects the user can see (for labelling tasks with their project). */
export async function loadProjectNames(): Promise<Record<number, string>> {
	try {
		const projects = await apiGetAuth<Project[]>('/projects');
		return Object.fromEntries(projects.map((p) => [p.id, p.name ?? p.title ?? '']));
	} catch {
		return {}; // labels are decoration: never fail the page over them
	}
}
