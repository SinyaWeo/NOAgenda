import type { Message } from '../../core';
import type { messages as en } from '../en/teams';

// Messages for the "teams" area. Keys are prefixed "teams." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
	'teams.title': 'Týmy',
	'teams.new': 'Nový tým',
	'teams.loading': 'Načítání týmů…',
	'teams.owner': 'Vlastník týmu',
	'teams.memberCount': {
		one: '{count} člen',
		few: '{count} členové',
		many: '{count} člena',
		other: '{count} členů'
	},
	'teams.view': 'Zobrazit',
	'teams.empty.text': 'Zatím žádné týmy.',
	'teams.empty.link': 'Vytvořit tým.',
	'teams.userFallback': 'Uživatel č. {id}',
	'teams.memberFallback': 'Člen č. {id}',
	'teams.members': 'Členové',
	'teams.noMembers': 'Zatím žádní členové.',

	'teams.create.title': 'Nový tým',
	'teams.create.submit': 'Vytvořit tým',
	'teams.create.submitting': 'Vytvářím…',
	'teams.create.failed': 'Tým se nepodařilo vytvořit',

	'teams.detail.loading': 'Načítání…',
	'teams.detail.edit': 'Upravit tým',
	'teams.detail.notFound': 'Tým nebyl nalezen.',

	'teams.edit.title': 'Upravit tým',
	'teams.edit.saveChanges': 'Uložit změny',
	'teams.edit.addMemberLabel': 'Přidat člena',
	'teams.edit.dangerZone': 'Nebezpečná zóna',
	'teams.edit.deleteTitle': 'Smazat tým',
	'teams.edit.deleteDesc': 'Trvale odstraní tento tým i všechny jeho členy.',
	'teams.edit.confirmDelete': 'Smazat tento tým?'
};
