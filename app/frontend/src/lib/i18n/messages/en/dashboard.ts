// Messages for the "dashboard" area (dashboard page and the Upcoming page). Keys are prefixed "dashboard." (see ../README.md).
export const messages = {
	'dashboard.loadFailed': 'Could not load your dashboard.',
	'dashboard.welcome': 'Welcome!',
	'dashboard.welcomeName': 'Welcome, {name}!',
	'dashboard.stat.projects': 'Projects',
	'dashboard.stat.upcoming': 'Upcoming',
	'dashboard.stat.overdue': 'Overdue',
	'dashboard.quickAdd.title': 'Quick Add',
	'dashboard.quickAdd.hint':
		'Long or multi-line text switches to a text area. Press Shift+Enter for a new line. Add as Task(s) makes one task per line, Add as Idea keeps the whole text as one idea.',
	'dashboard.quickAdd.placeholder': 'Task title or idea… (one task per line)',
	'dashboard.quickAdd.noProject': 'No project',
	'dashboard.quickAdd.adding': 'Adding…',
	'dashboard.quickAdd.addTasks': 'Add as Task(s)',
	'dashboard.quickAdd.addIdea': 'Add as Idea',
	'dashboard.quickAdd.ideaAdded': 'Idea added',
	'dashboard.quickAdd.ideaFailed': 'Could not add the idea',
	'dashboard.quickAdd.lineTooLong': 'A task title can have at most {max} characters.',
	'dashboard.quickAdd.failed': 'Could not add the task',
	'dashboard.overdue.title': 'Overdue',
	'dashboard.upcomingTasks.title': 'Upcoming Tasks',
	'dashboard.viewAll': 'View all',
	'dashboard.recentProjects.title': 'Recent Projects',
	'dashboard.recentProjects.empty': 'No projects yet. {link}.',
	'dashboard.recentProjects.create': 'Create one',

	'dashboard.upcoming.title': 'Upcoming Tasks'
} as const;
