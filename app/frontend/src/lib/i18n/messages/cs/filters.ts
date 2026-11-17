import type { Message } from '../../core';
import type { messages as en } from '../en/filters';

// Messages for the "filters" area (saved filters page, criteria editor, filter chips). Keys are prefixed "filters." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
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
