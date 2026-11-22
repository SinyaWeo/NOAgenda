import type { Message } from '../../core';
import type { messages as en } from '../en/dashboard';

// Messages for the "dashboard" area (dashboard page and the Upcoming page). Keys are prefixed "dashboard." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
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
	'dashboard.viewAll': 'Zobrazit vše',
	'dashboard.recentProjects.title': 'Nedávné projekty',
	'dashboard.recentProjects.empty': 'Zatím žádné projekty. {link}.',
	'dashboard.recentProjects.create': 'Vytvořit projekt',

	'dashboard.upcoming.title': 'Nadcházející úkoly'
};
