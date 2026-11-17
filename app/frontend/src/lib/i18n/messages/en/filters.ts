// Messages for the "filters" area (saved filters page, criteria editor, filter chips). Keys are prefixed "filters." (see ../README.md).
export const messages = {
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
