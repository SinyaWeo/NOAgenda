import { fmt, locale, t } from '#lib/i18n/index.js';
import { dateInputToIso, isoToDateInput } from '#lib/dates.js';
import type { Task } from '#lib/types.js';

/** Which repeat rule a task uses; `none` = it does not repeat. The rest are the API's `repeatMode` values. */
export type RepeatKind =
	'none' | 'default' | 'weekly' | 'monthly' | 'monthly_weekday' | 'month_end' | 'from_current_date';

export const REPEAT_KINDS: RepeatKind[] = [
	'none',
	'default',
	'weekly',
	'monthly',
	'monthly_weekday',
	'month_end',
	'from_current_date'
];

export type RepeatEnd = 'never' | 'until' | 'count';

/** What the repeat fields of the task form edit. */
export interface RepeatForm {
	kind: RepeatKind;
	every: number;
	/** ISO weekdays, 1 = Monday ... 7 = Sunday (weekly rule). */
	weekdays: number[];
	end: RepeatEnd;
	/** yyyy-mm-dd, for end = 'until'. */
	until: string;
	/** Occurrences left, this one included, for end = 'count'. */
	count: number;
	/** Whether each new cycle unticks the done subtasks. */
	resetSubtasks: boolean;
}

/** The task fields a repeat rule is made of. */
export type RepeatFields = Pick<
	Task,
	'repeatAfter' | 'repeatMode' | 'repeatWeekdays' | 'repeatUntil' | 'repeatCount' | 'repeatResetSubtasks'
>;

export const emptyRepeat = (): RepeatForm => ({
	kind: 'none',
	every: 1,
	weekdays: [],
	end: 'never',
	until: '',
	count: 5,
	resetSubtasks: true
});

function isKind(value: unknown): value is RepeatKind {
	return typeof value === 'string' && (REPEAT_KINDS as string[]).includes(value);
}

export function parseWeekdays(value: string | null | undefined): number[] {
	const days = (value ?? '')
		.split(',')
		.map(Number)
		.filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
	return [...new Set(days)].sort((a, b) => a - b);
}

/** The form for a task's rule; `timeZone` is the one the end date is shown in (`userTimeZone()`). */
export function formFromTask(task: RepeatFields, timeZone: string): RepeatForm {
	if (!task.repeatAfter || task.repeatAfter < 1) return emptyRepeat();
	const kind = isKind(task.repeatMode) && task.repeatMode !== 'none' ? task.repeatMode : 'default';
	const end: RepeatEnd = task.repeatCount ? 'count' : task.repeatUntil ? 'until' : 'never';
	return {
		kind,
		every: task.repeatAfter,
		weekdays: parseWeekdays(task.repeatWeekdays),
		end,
		until: isoToDateInput(task.repeatUntil, timeZone),
		count: task.repeatCount ?? 5,
		resetSubtasks: task.repeatResetSubtasks !== false
	};
}

/**
 * The API fields for a form; every one of them is sent so that clearing a rule really clears it.
 * `timeZone` is the one the end date was picked in (`userTimeZone()`).
 */
export function repeatPayload(form: RepeatForm, timeZone: string) {
	if (form.kind === 'none') {
		return {
			repeatAfter: null,
			repeatMode: null,
			repeatWeekdays: null,
			repeatUntil: null,
			repeatCount: null,
			repeatResetSubtasks: true
		};
	}
	return {
		repeatAfter: Math.max(1, Math.floor(Number(form.every) || 1)),
		repeatMode: form.kind,
		repeatWeekdays:
			form.kind === 'weekly' && form.weekdays.length
				? parseWeekdays(form.weekdays.join(',')).join(',')
				: null,
		repeatUntil: form.end === 'until' ? dateInputToIso(form.until, timeZone) : null,
		repeatCount: form.end === 'count' ? Math.max(1, Math.floor(Number(form.count) || 1)) : null,
		repeatResetSubtasks: form.resetSubtasks
	};
}

/** Add the weekday if it is missing, remove it otherwise. */
export function toggleWeekday(days: number[], day: number): number[] {
	return days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b);
}

/** Short weekday name in the current language (1 = Monday ... 7 = Sunday). */
export function weekdayName(day: number, style: 'short' | 'long' = 'short'): string {
	// 2024-01-01 was a Monday.
	return new Intl.DateTimeFormat(locale.current, { weekday: style, timeZone: 'UTC' }).format(
		new Date(Date.UTC(2024, 0, day))
	);
}

/** "Every 2 weeks on Mon, Wed - 3 occurrences left" in the current language; '' when the task does not repeat. */
export function describeRepeat(task: RepeatFields): string {
	// Only the rule is read here; the end date is formatted from `task.repeatUntil` itself, so any zone will do.
	const form = formFromTask(task, 'UTC');
	if (form.kind === 'none') return '';
	const count = form.every;
	let text: string;
	switch (form.kind) {
		case 'weekly': {
			const days = form.weekdays.map((d) => weekdayName(d)).join(', ');
			text = days
				? t('tasks.repeat.summary.weeklyOn', { count, days })
				: t('tasks.repeat.summary.weekly', { count });
			break;
		}
		case 'monthly':
			text = t('tasks.repeat.summary.monthly', { count });
			break;
		case 'monthly_weekday':
			text = t('tasks.repeat.summary.monthlyWeekday', { count });
			break;
		case 'month_end':
			text = t('tasks.repeat.summary.monthEnd', { count });
			break;
		case 'from_current_date':
			text = t('tasks.repeat.summary.afterCompletion', { count });
			break;
		default:
			text = t('tasks.repeat.summary.daily', { count });
	}
	if (form.end === 'count') text += ` · ${t('tasks.repeat.summary.left', { count: form.count })}`;
	else if (form.end === 'until' && task.repeatUntil) {
		text += ` · ${t('tasks.repeat.summary.until', { date: fmt.date(task.repeatUntil) })}`;
	}
	return text;
}
