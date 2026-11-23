import type { Message } from '../../core';
import type { messages as en } from '../en/activity';

// Czech texts for the "activity" area.
export const messages: Record<keyof typeof en, Message> = {
	'activity.title': 'Historie změn',
	'activity.empty': 'Zatím nebyla zaznamenána žádná aktivita.',
	'activity.loadFailed': 'Historii změn se nepodařilo načíst.',
	'activity.loadMore': 'Načíst další',
	'activity.untitled': 'bez názvu',
	'activity.noValue': '—',
	'activity.valueChanged': 'Změněno: {field}',
	'activity.change': '{field}: {from} → {to}',

	'activity.action.task.created': '{actor}: vytvořen úkol „{title}“',
	'activity.action.task.updated': '{actor}: upraven úkol „{title}“',
	'activity.action.task.archived': '{actor}: archivován úkol „{title}“',
	'activity.action.task.restored': '{actor}: obnoven úkol „{title}“',
	'activity.action.task.undeleted': '{actor} obnovil(a) úkol „{title}“ z koše',
	'activity.action.project.undeleted': '{actor} obnovil(a) projekt „{title}“ z koše',
	'activity.action.task.moved': '{actor}: přesunut úkol „{title}“',
	'activity.action.task.deleted': '{actor}: smazán úkol „{title}“',
	'activity.action.task.deletedWith': {
		one: '{actor}: smazán úkol „{title}“ a {count} podúkol',
		few: '{actor}: smazán úkol „{title}“ a {count} podúkoly',
		many: '{actor}: smazán úkol „{title}“ a {count} podúkolu',
		other: '{actor}: smazán úkol „{title}“ a {count} podúkolů'
	},
	'activity.action.project.created': '{actor}: vytvořen projekt „{title}“',
	'activity.action.project.updated': '{actor}: upraven projekt „{title}“',
	'activity.action.project.archived': '{actor}: archivován projekt „{title}“',
	'activity.action.project.restored': '{actor}: obnoven projekt „{title}“',
	'activity.action.project.moved': '{actor}: přesunut projekt „{title}“',
	'activity.action.project.deleted': '{actor}: smazán projekt „{title}“',
	'activity.action.project.deletedWith': {
		one: '{actor}: smazán projekt „{title}“ a {count} položka v něm',
		few: '{actor}: smazán projekt „{title}“ a {count} položky v něm',
		many: '{actor}: smazán projekt „{title}“ a {count} položky v něm',
		other: '{actor}: smazán projekt „{title}“ a {count} položek v něm'
	},
	'activity.action.idea.created': '{actor}: vytvořen nápad „{title}“',
	'activity.action.idea.updated': '{actor}: upraven nápad „{title}“',
	'activity.action.idea.deleted': '{actor}: smazán nápad „{title}“',
	'activity.action.idea.undeleted': '{actor}: nápad „{title}“ obnoven z koše',
	'activity.action.comment.created': '{actor}: komentář u „{title}“',
	'activity.action.comment.updated': '{actor}: upraven komentář u „{title}“',
	'activity.action.comment.deleted': '{actor}: smazán komentář u „{title}“',
	'activity.action.assignee.set': '{actor}: „{title}“ přiřazen(o) uživateli {to}',
	'activity.action.assignee.changed': '{actor}: řešitel „{title}“ změněn z {from} na {to}',
	'activity.action.assignee.cleared': '{actor}: odebrán řešitel {from} z „{title}“',
	'activity.action.label.added': '{actor}: přidán štítek {label} k „{title}“',
	'activity.action.label.removed': '{actor}: odebrán štítek {label} z „{title}“',
	'activity.action.relation.added': '{actor}: přidán vztah u „{title}“: {kind} „{other}“',
	'activity.action.relation.removed': '{actor}: odebrán vztah u „{title}“: {kind} „{other}“',
	'activity.action.attachment.added': '{actor}: přiložena příloha {file} k „{title}“',
	'activity.action.attachment.removed': '{actor}: odebrána příloha {file} z „{title}“',
	'activity.action.unknown': '{actor}: změněno „{title}“',

	'activity.field.title': 'Název',
	'activity.field.name': 'Název',
	'activity.field.description': 'Popis',
	'activity.field.status': 'Stav',
	'activity.field.priority': 'Priorita',
	'activity.field.dueDate': 'Termín',
	'activity.field.startDate': 'Začátek',
	'activity.field.percentDone': 'Průběh',
	'activity.field.parentId': 'Nadřazená položka',
	'activity.field.isArchived': 'Archivováno',
	'activity.field.bucketId': 'Sloupec Kanbanu',
	'activity.field.repeat': 'Opakování',

	// Admin audit page
	'activity.admin.title': 'Auditní záznam',
	'activity.admin.pageTitle': 'Auditní záznam — správa',
	'activity.admin.hint':
		'Vše, co se změnilo ve všech projektech a osobních úkolech, včetně toho, co bylo mezitím smazáno.',
	'activity.admin.filterActor': 'ID uživatele',
	'activity.admin.filterProject': 'ID projektu',
	'activity.admin.filterAction': 'Akce',
	'activity.admin.filterFrom': 'Od',
	'activity.admin.filterTo': 'Do',
	'activity.admin.anyAction': 'Jakákoli akce',
	'activity.admin.apply': 'Použít',
	'activity.admin.reset': 'Zrušit filtry',
	'activity.admin.projectNone': 'osobní',
	'activity.admin.projectId': '#{id}',

	// Project and personal feeds
	'activity.project.title': 'Aktivita v projektu',
	'activity.project.link': 'Aktivita',
	'activity.project.back': 'Zpět na projekt',
	'activity.mine.title': 'Moje aktivita',
	'activity.mine.hint':
		'Co jste změnili vy, a co se stalo s vašimi osobními úkoly a s vašimi projekty, které byly smazány.'
};
