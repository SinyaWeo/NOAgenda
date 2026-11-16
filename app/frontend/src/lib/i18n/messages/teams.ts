import type { Message } from '../core';

// Messages for the "teams" area. Keys are prefixed "teams." (see ../README.md).
export const en = {
	'teams.title': 'Teams',
	'teams.new': 'New Team',
	'teams.loading': 'Loading teams...',
	'teams.owner': 'Team Owner',
	'teams.memberCount': { one: '{count} member', other: '{count} members' },
	'teams.view': 'View',
	'teams.empty.text': 'No teams yet.',
	'teams.empty.link': 'Create a team.',
	'teams.userFallback': 'User #{id}',
	'teams.memberFallback': 'Member #{id}',
	'teams.members': 'Members',
	'teams.noMembers': 'No members yet.',

	'teams.create.title': 'New Team',
	'teams.create.submit': 'Create Team',
	'teams.create.submitting': 'Creating…',
	'teams.create.failed': 'Failed to create team',

	'teams.detail.loading': 'Loading...',
	'teams.detail.edit': 'Edit Team',
	'teams.detail.notFound': 'Team not found.',

	'teams.edit.title': 'Edit Team',
	'teams.edit.saveChanges': 'Save Changes',
	'teams.edit.addMemberLabel': 'Add a member',
	'teams.edit.dangerZone': 'Danger Zone',
	'teams.edit.deleteTitle': 'Delete Team',
	'teams.edit.deleteDesc': 'Permanently removes this team and all its members.',
	'teams.edit.confirmDelete': 'Delete this team?'
} as const;

export const cs: Record<keyof typeof en, Message> = {
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
