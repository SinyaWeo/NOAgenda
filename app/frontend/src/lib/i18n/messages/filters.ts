import type { Message } from '../core';

// Messages for the "filters" area (saved filters page, criteria editor, filter chips). Keys are prefixed "filters." (see ../README.md).
export const en = {
	'filters.title': 'Saved Filters',
	'filters.name': 'Filter name',
	'filters.descriptionOptional': 'Description (optional)',
	'filters.save': '+ Save Filter',
	'filters.empty': 'No saved filters yet. Create one above.',
	'filters.confirmDelete': 'Delete this filter?',

	'filters.editor.anyStatus': 'Any status',
	'filters.editor.anyPriority': 'Any priority',
	'filters.editor.anyProject': 'Any project',
	'filters.editor.searchText': 'Search text',
	'filters.editor.searchPlaceholder': 'Title contains…',
	'filters.editor.anyTime': 'Any time',
	'filters.editor.hideDone': 'Hide done',
	'filters.editor.due.overdue': 'Overdue',
	'filters.editor.due.today': 'Today',
	'filters.editor.due.week': 'Next 7 days',
	'filters.editor.due.month': 'Next 30 days',
	'filters.editor.due.none': 'No due date',

	'filters.chip.status': 'Status: {value}',
	'filters.chip.priority': 'Priority: {value}',
	'filters.chip.project': 'Project #{id}',
	'filters.chip.search': 'Search: {value}',
	'filters.chip.due': 'Due: {value}',
	'filters.chip.hideDone': 'Hide done',
	'filters.due.overdue': 'overdue',
	'filters.due.today': 'today',
	'filters.due.week': 'this week',
	'filters.due.month': 'this month',
	'filters.due.none': 'no due date'
} as const;

export const cs: Record<keyof typeof en, Message> = {
	'filters.title': 'Uložené filtry',
	'filters.name': 'Název filtru',
	'filters.descriptionOptional': 'Popis (volitelný)',
	'filters.save': '+ Uložit filtr',
	'filters.empty': 'Zatím žádné uložené filtry. Vytvořte první výše.',
	'filters.confirmDelete': 'Smazat tento filtr?',

	'filters.editor.anyStatus': 'Jakýkoli stav',
	'filters.editor.anyPriority': 'Jakákoli priorita',
	'filters.editor.anyProject': 'Jakýkoli projekt',
	'filters.editor.searchText': 'Hledaný text',
	'filters.editor.searchPlaceholder': 'Název obsahuje…',
	'filters.editor.anyTime': 'Kdykoli',
	'filters.editor.hideDone': 'Skrýt hotové',
	'filters.editor.due.overdue': 'Po termínu',
	'filters.editor.due.today': 'Dnes',
	'filters.editor.due.week': 'Příštích 7 dní',
	'filters.editor.due.month': 'Příštích 30 dní',
	'filters.editor.due.none': 'Bez termínu',

	'filters.chip.status': 'Stav: {value}',
	'filters.chip.priority': 'Priorita: {value}',
	'filters.chip.project': 'Projekt č. {id}',
	'filters.chip.search': 'Hledání: {value}',
	'filters.chip.due': 'Termín: {value}',
	'filters.chip.hideDone': 'Skrýt hotové',
	'filters.due.overdue': 'po termínu',
	'filters.due.today': 'dnes',
	'filters.due.week': 'tento týden',
	'filters.due.month': 'tento měsíc',
	'filters.due.none': 'bez termínu'
};
