// Messages for the "teams" area. Keys are prefixed "teams." (see ../README.md).
export const messages = {
	'teams.title': 'Teams',
	'teams.new': 'New Team',
	'teams.loading': 'Loading teams...',
	'teams.role.manager': 'Manager',
	'teams.role.member': 'Member',
	'teams.role.change': 'Role of {name}',
	'teams.role.failed': 'Could not change the role',
	'teams.memberCount': { one: '{count} member', other: '{count} members' },
	'teams.view': 'View',
	'teams.empty.text': 'No teams yet.',
	'teams.empty.link': 'Create a team.',
	'teams.empty.adminHint': 'This page lists only your own teams. Looking for team management?',
	'teams.empty.adminLink': 'Open Admin → Teams.',
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
	'teams.edit.managerOnly': 'Only a team manager can edit this team.',
	'teams.edit.managerHint': 'Managers add and remove members. Only an admin can appoint or remove managers.',
	'teams.edit.dangerZone': 'Danger Zone',
	'teams.edit.deleteTitle': 'Delete Team',
	'teams.edit.deleteDesc':
		'Permanently removes this team and all its members. Projects shared with it are no longer shared with them.',
	'teams.edit.confirmDelete': 'Delete this team?'
} as const;
