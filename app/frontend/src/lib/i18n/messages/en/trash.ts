// Messages for the "trash" area. Keys are prefixed "trash." (see ../README.md).
export const messages = {
	'trash.title': 'Trash',
	'trash.hint':
		'Deleted tasks, projects and ideas stay here until they are removed automatically. Restoring brings back everything that was deleted with them.',
	'trash.empty': 'The trash is empty.',
	'trash.loadFailed': 'Could not load the trash.',
	'trash.type.task': 'Task',
	'trash.type.project': 'Project',
	'trash.type.idea': 'Idea',
	'trash.deletedAt': 'Deleted {when}',
	'trash.untitled': 'untitled',
	'trash.deleted': 'Deleted {when} by {who}',
	'trash.purgeAt': 'Removed for good {when}',
	'trash.restore': 'Restore',
	'trash.restored': 'Restored',
	'trash.restoreFailed': 'Could not restore it',
	'trash.purge': 'Delete permanently',
	'trash.purged': 'Deleted permanently',
	'trash.purgeFailed': 'Could not delete it',
	'trash.confirmPurge': 'Delete “{title}” permanently? This cannot be undone.'
} as const;
