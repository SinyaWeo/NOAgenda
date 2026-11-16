import type { Message } from '../core';

// Messages for the "dashboard" area (dashboard page and the Upcoming page). Keys are prefixed "dashboard." (see ../README.md).
export const en = {
	'dashboard.loadFailed': 'Could not load your dashboard.',
	'dashboard.welcome': 'Welcome!',
	'dashboard.welcomeName': 'Welcome, {name}!',
	'dashboard.stat.projects': 'Projects',
	'dashboard.stat.upcoming': 'Upcoming',
	'dashboard.stat.overdue': 'Overdue',
	'dashboard.quickAdd.title': 'Quick Add Task',
	'dashboard.quickAdd.titlePlaceholder': 'Task title…',
	'dashboard.quickAdd.selectProject': 'Select project…',
	'dashboard.quickAdd.adding': 'Adding…',
	'dashboard.quickAdd.add': '+ Add',
	'dashboard.quickAdd.failed': 'Could not add the task',
	'dashboard.overdue.title': 'Overdue',
	'dashboard.upcomingTasks.title': 'Upcoming Tasks',
	'dashboard.upcomingTasks.empty': 'No pending tasks.',
	'dashboard.viewAll': 'View all',
	'dashboard.recentProjects.title': 'Recent Projects',
	'dashboard.recentProjects.empty': 'No projects yet. {link}.',
	'dashboard.recentProjects.create': 'Create one',

	'dashboard.upcoming.title': 'Upcoming Tasks',
	'dashboard.upcoming.showNext': 'Show next',
	'dashboard.upcoming.days': { one: '{count} day', other: '{count} days' },
	'dashboard.upcoming.includeOverdue': 'Include overdue',
	'dashboard.upcoming.empty': 'No upcoming tasks in this range.',
	'dashboard.upcoming.emptyHint': 'Try extending the date range or enabling overdue tasks.',
	'dashboard.upcoming.notSet': 'Not set'
} as const;

export const cs: Record<keyof typeof en, Message> = {
	'dashboard.loadFailed': 'Přehled se nepodařilo načíst.',
	'dashboard.welcome': 'Vítejte!',
	'dashboard.welcomeName': 'Vítejte, {name}!',
	'dashboard.stat.projects': 'Projekty',
	'dashboard.stat.upcoming': 'Nadcházející',
	'dashboard.stat.overdue': 'Po termínu',
	'dashboard.quickAdd.title': 'Rychlé přidání úkolu',
	'dashboard.quickAdd.titlePlaceholder': 'Název úkolu…',
	'dashboard.quickAdd.selectProject': 'Vyberte projekt…',
	'dashboard.quickAdd.adding': 'Přidávám…',
	'dashboard.quickAdd.add': '+ Přidat',
	'dashboard.quickAdd.failed': 'Úkol se nepodařilo přidat',
	'dashboard.overdue.title': 'Po termínu',
	'dashboard.upcomingTasks.title': 'Nadcházející úkoly',
	'dashboard.upcomingTasks.empty': 'Žádné nevyřízené úkoly.',
	'dashboard.viewAll': 'Zobrazit vše',
	'dashboard.recentProjects.title': 'Nedávné projekty',
	'dashboard.recentProjects.empty': 'Zatím žádné projekty. {link}.',
	'dashboard.recentProjects.create': 'Vytvořit projekt',

	'dashboard.upcoming.title': 'Nadcházející úkoly',
	'dashboard.upcoming.showNext': 'Zobrazit příštích',
	'dashboard.upcoming.days': {
		one: '{count} den',
		few: '{count} dny',
		many: '{count} dne',
		other: '{count} dní'
	},
	'dashboard.upcoming.includeOverdue': 'Včetně úkolů po termínu',
	'dashboard.upcoming.empty': 'V tomto období nejsou žádné nadcházející úkoly.',
	'dashboard.upcoming.emptyHint': 'Zkuste prodloužit období nebo zahrnout úkoly po termínu.',
	'dashboard.upcoming.notSet': 'Nenastaven'
};
