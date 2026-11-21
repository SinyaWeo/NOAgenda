/** Curated development milestones, newest first. Texts: auth.about.timeline.<id>.title/.body */
export interface TimelineEntry {
	id: string;
	/** ISO date (yyyy-mm-dd) */
	date: string;
}

export const TIMELINE: readonly TimelineEntry[] = [
	{ id: 'teams', date: '2026-11-21' },
	{ id: 'views', date: '2026-11-21' },
	{ id: 'demo', date: '2026-11-20' },
	{ id: 'branding', date: '2026-11-19' },
	{ id: 'containers', date: '2026-11-18' },
	{ id: 'automation', date: '2026-11-17' },
	{ id: 'hardening', date: '2026-11-15' },
	{ id: 'theme', date: '2026-05-22' },
	{ id: 'ux', date: '2026-05-12' },
	{ id: 'roles', date: '2026-05-04' },
	{ id: 'nodes', date: '2026-05-03' },
	{ id: 'flowbite', date: '2026-05-02' },
	{ id: 'start', date: '2026-04-24' }
];
