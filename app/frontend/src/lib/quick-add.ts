/** Longest task title the API accepts (TaskCreateDto.title). */
export const MAX_TASK_TITLE = 255;
/** Past this many characters the quick-add input becomes a text area. */
export const QUICK_ADD_INLINE_MAX = 80;

/** Does the text no longer fit a single-line input: it has a line break or is long. */
export function needsTextarea(text: string): boolean {
	return text.includes('\n') || text.length > QUICK_ADD_INLINE_MAX;
}

/** One task title per non-empty line, trimmed. */
export function taskTitles(text: string): string[] {
	return text
		.split(/\r\n|\r|\n/)
		.map((l) => l.trim())
		.filter(Boolean);
}
