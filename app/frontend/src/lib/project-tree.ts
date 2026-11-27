import type { Project } from '#lib/types.js';

/** A project with how deep it sits below the top of the list (0: top level or parent not visible). */
export interface ProjectTreeRow {
	project: Project;
	depth: number;
}

/**
 * Projects ordered as a tree: each project followed by its subprojects, at any depth. Siblings keep
 * their order in `projects`. A project whose parent is not in the list (not shared with the user,
 * archived and left out, ...) counts as top level. Cycle-safe.
 */
export function projectTree(projects: Project[]): ProjectTreeRow[] {
	const ids = new Set(projects.map((p) => p.id));
	const children = new Map<number | null, Project[]>();
	for (const p of projects) {
		const parent = p.parentId != null && ids.has(p.parentId) ? p.parentId : null;
		children.set(parent, [...(children.get(parent) ?? []), p]);
	}
	const out: ProjectTreeRow[] = [];
	const seen = new Set<number>();
	const walk = (parent: number | null, depth: number) => {
		for (const p of children.get(parent) ?? []) {
			if (seen.has(p.id)) continue;
			seen.add(p.id);
			out.push({ project: p, depth });
			walk(p.id, depth + 1);
		}
	};
	walk(null, 0);
	// A loop of parents with no way in from the top: list those projects at the top level.
	for (const p of projects) if (!seen.has(p.id)) out.push({ project: p, depth: 0 });
	return out;
}

/** The ids of every project below `id` (not `id` itself). */
export function descendantIds(projects: Project[], id: number): Set<number> {
	const out = new Set<number>();
	let frontier = [id];
	while (frontier.length) {
		const next = projects
			.filter((p) => p.parentId != null && frontier.includes(p.parentId) && !out.has(p.id) && p.id !== id)
			.map((p) => p.id);
		for (const n of next) out.add(n);
		frontier = next;
	}
	return out;
}

/** The visible projects above `id`, top first (stops where a parent is not in the list). */
export function ancestors(projects: Project[], id: number): Project[] {
	const byId = new Map(projects.map((p) => [p.id, p]));
	const out: Project[] = [];
	let parent = byId.get(byId.get(id)?.parentId ?? -1);
	while (parent && parent.id !== id && !out.includes(parent)) {
		out.unshift(parent);
		parent = byId.get(parent.parentId ?? -1);
	}
	return out;
}

/** Options for a project `<select>`, in tree order with each level indented. */
export function projectOptions(projects: Project[]): { id: number; label: string }[] {
	return projectTree(projects).map(({ project, depth }) => ({
		id: project.id,
		label: `${'   '.repeat(depth)}${project.name ?? project.title ?? ''}`
	}));
}
