// Messages for the "teams" area. Keys are prefixed "teams." (see ../README.md).
export const messages = {
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
