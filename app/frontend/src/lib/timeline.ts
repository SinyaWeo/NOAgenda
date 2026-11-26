/** Curated development milestones, newest first. Texts: auth.about.timeline.<id>.title/.body */
export interface TimelineEntry {
	id: string;
	/** ISO date (yyyy-mm-dd) */
	date: string;
}

export const TIMELINE: readonly TimelineEntry[] = [
	{ id: 'svelte5', date: '2026-11-26' },
	{ id: 'emailChange', date: '2026-11-26' },
	{ id: 'profilePage', date: '2026-11-26' },
	{ id: 'tidyUp', date: '2026-11-26' },
	{ id: 'taskPage', date: '2026-11-25' },
	{ id: 'tasksByProject', date: '2026-11-25' },
	{ id: 'projectViews', date: '2026-11-25' },
	{ id: 'singleUser', date: '2026-11-24' },
	{ id: 'adminTools', date: '2026-11-24' },
	{ id: 'quickNotes', date: '2026-11-24' },
	{ id: 'trash', date: '2026-11-23' },
	{ id: 'ideas', date: '2026-11-23' },
	{ id: 'calendar', date: '2026-11-22' },
	{ id: 'activity', date: '2026-11-22' },
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
