import type { Message } from '../../core';
import type { messages as en } from '../en/dashboard';

// Messages for the "dashboard" area (dashboard page and the Upcoming page). Keys are prefixed "dashboard." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
	'dashboard.loadFailed': 'Přehled se nepodařilo načíst.',
	'dashboard.stat.projects': 'Projekty',
	'dashboard.stat.upcoming': 'Nadcházející',
	'dashboard.stat.overdue': 'Po\u00a0termínu',
	'dashboard.quickAdd.title': 'Rychlé přidání',
	'dashboard.quickAdd.hint':
		'Přidat jako úkol(y) vytvoří jeden úkol z každého řádku, Přidat jako nápad uloží celý text jako jeden nápad.\nShift+Enter vloží nový řádek.',
	'dashboard.quickAdd.placeholder': 'Název úkolu nebo nápad… (jeden úkol na řádek)',
	'dashboard.quickAdd.noProject': 'Bez projektu',
	'dashboard.quickAdd.adding': 'Přidávám…',
	'dashboard.quickAdd.addTasks': 'Přidat jako úkol(y)',
	'dashboard.quickAdd.addIdea': 'Přidat jako nápad',
	'dashboard.quickAdd.ideaAdded': 'Nápad přidán',
	'dashboard.quickAdd.ideaFailed': 'Nápad se nepodařilo přidat',
	'dashboard.quickAdd.lineTooLong': 'Název úkolu může mít nejvýše {max} znaků.',
	'dashboard.quickAdd.failed': 'Úkol se nepodařilo přidat',
	'dashboard.notes.title': 'Poznámky',
	'dashboard.notes.placeholder': 'Něco si poznamenejte… (Enter přidá)',
	'dashboard.notes.empty': 'Zatím žádné poznámky.',
	'dashboard.notes.loadFailed': 'Poznámky se nepodařilo načíst.',
	'dashboard.notes.addFailed': 'Poznámku se nepodařilo přidat',
	'dashboard.notes.saveFailed': 'Poznámku se nepodařilo uložit',
	'dashboard.notes.deleteFailed': 'Poznámku se nepodařilo smazat',
	'dashboard.notes.convert': 'Převést poznámku',
	'dashboard.notes.convertFailed': 'Poznámku se nepodařilo převést',
	'dashboard.notes.convertTo.task': 'Převést na úkol',
	'dashboard.notes.convertTo.project': 'Převést na projekt',
	'dashboard.notes.convertTo.idea': 'Převést na nápad',
	'dashboard.notes.converted.task': 'Poznámka byla převedena na úkol',
	'dashboard.notes.converted.project': 'Poznámka byla převedena na projekt',
	'dashboard.notes.converted.idea': 'Poznámka byla převedena na nápad',
	'dashboard.notes.showCompleted': 'Zobrazit dokončené ({count})',
	'dashboard.notes.hideCompleted': 'Skrýt dokončené ({count})',
	'dashboard.notes.clearCompleted': 'Smazat dokončené',
	'dashboard.notes.clearConfirm': 'Smazat všechny dokončené poznámky?',
	'dashboard.overdue.title': 'Po termínu',
	'dashboard.upcomingTasks.title': 'Nadcházející úkoly',
	'dashboard.viewAll': 'Zobrazit vše',
	'dashboard.recentProjects.title': 'Nedávné projekty',
	'dashboard.recentProjects.empty': 'Zatím žádné projekty. {link}.',
	'dashboard.recentProjects.create': 'Vytvořit projekt',

	'dashboard.upcoming.title': 'Nadcházející úkoly'
};
