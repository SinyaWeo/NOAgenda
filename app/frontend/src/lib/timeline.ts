/**
 * Curated development milestones, newest first. Texts: auth.about.timeline.<id>.title/.body (en + cs).
 * Empty until version 1.0.0 is deployed; the About page shows the section only when there are entries.
 */
export interface TimelineEntry {
	id: string;
	/** ISO date (yyyy-mm-dd) */
	date: string;
}

export const TIMELINE: readonly TimelineEntry[] = [];
