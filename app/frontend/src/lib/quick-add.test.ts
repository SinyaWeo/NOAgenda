import { describe, expect, it } from 'vitest';
import { QUICK_ADD_INLINE_MAX, needsTextarea, taskTitles } from './quick-add';

describe('needsTextarea', () => {
	it('keeps a short single line in the input', () => {
		expect(needsTextarea('Buy milk')).toBe(false);
		expect(needsTextarea('x'.repeat(QUICK_ADD_INLINE_MAX))).toBe(false);
	});
	it('switches on a line break or a long text', () => {
		expect(needsTextarea('a\nb')).toBe(true);
		expect(needsTextarea('x'.repeat(QUICK_ADD_INLINE_MAX + 1))).toBe(true);
	});
});

describe('taskTitles', () => {
	it('makes one title per non-empty line, trimmed', () => {
		expect(taskTitles('  one \n\ntwo\r\n three\r\n')).toEqual(['one', 'two', 'three']);
	});
	it('gives one title for a single line and none for blanks', () => {
		expect(taskTitles('single')).toEqual(['single']);
		expect(taskTitles(' \n \n')).toEqual([]);
	});
});
