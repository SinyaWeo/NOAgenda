export interface TimeZoneOption {
	value: string;
	/** "(UTC+01:00) Europe/Prague" */
	label: string;
	offsetMinutes: number;
}

/** Used where the browser cannot list zones (Intl.supportedValuesOf is missing). */
const FALLBACK = [
	'UTC',
	'Europe/London',
	'Europe/Lisbon',
	'Europe/Prague',
	'Europe/Berlin',
	'Europe/Paris',
	'Europe/Athens',
	'Europe/Moscow',
	'Asia/Dubai',
	'Asia/Kolkata',
	'Asia/Shanghai',
	'Asia/Tokyo',
	'Australia/Sydney',
	'Pacific/Auckland',
	'America/Sao_Paulo',
	'America/New_York',
	'America/Chicago',
	'America/Denver',
	'America/Los_Angeles'
];

function listZones(): string[] {
	try {
		const list = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.(
			'timeZone'
		);
		if (list?.length) return list;
	} catch {
		/* fall through */
	}
	return FALLBACK;
}

/** Offset from UTC at `at`, in minutes, or null when the zone is unknown to Intl. */
export function offsetMinutes(timeZone: string, at: Date): number | null {
	try {
		const part = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' })
			.formatToParts(at)
			.find((p) => p.type === 'timeZoneName')?.value;
		if (!part) return null;
		if (part === 'GMT') return 0;
		const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(part);
		if (!m) return null;
		return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0));
	} catch {
		return null;
	}
}

export function formatOffset(minutes: number): string {
	const sign = minutes < 0 ? '-' : '+';
	const abs = Math.abs(minutes);
	return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/**
 * The choices for a time zone <select>, ordered by offset and then name. `current` is always among them,
 * even when it is a zone the browser does not list (an old alias, or "UTC"), so that opening the form
 * and saving it never silently changes the user's zone.
 */
export function timeZoneOptions(current?: string | null, at: Date = new Date()): TimeZoneOption[] {
	const names = new Set<string>(['UTC', ...listZones()]);
	if (current) names.add(current);
	const out: TimeZoneOption[] = [];
	for (const value of names) {
		const offset = offsetMinutes(value, at);
		if (offset === null && value !== current) continue;
		out.push({
			value,
			label: offset === null ? value : `(${formatOffset(offset)}) ${value}`,
			offsetMinutes: offset ?? 0
		});
	}
	return out.sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value));
}
