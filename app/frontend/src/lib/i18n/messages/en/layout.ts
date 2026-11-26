// Messages for the "layout" area. Keys are prefixed "layout." (see ../README.md).
export const messages = {
	// Browser tab titles
	'layout.title.dashboard': 'Dashboard',
	'layout.title.newProject': 'New project',
	'layout.title.projects': 'Projects',
	'layout.title.newTask': 'New task',
	'layout.title.tasks': 'Tasks',
	'layout.title.ideas': 'Ideas',
	'layout.title.upcoming': 'Upcoming',
	'layout.title.teams': 'Teams',
	'layout.title.activity': 'My activity',
	'layout.title.labels': 'Labels',
	'layout.title.filters': 'Filters',
	'layout.title.mindmap': 'Mind map',
	'layout.title.about': 'About',
	'layout.title.admin': 'Administration',
	'layout.title.settings': 'Settings',
	'layout.title.login': 'Sign in',
	'layout.title.register': 'Create account',
	'layout.title.resetRequest': 'Reset password',
	'layout.title.resetPassword': 'Choose a new password',
	'layout.title.verifyEmail': 'Confirm email',
	'layout.title.terms': 'Terms of Service',
	'layout.title.privacy': 'Privacy Policy',
	'layout.titleWithApp': '{title} · {app}',

	// Shell
	'layout.skipToContent': 'Skip to content',
	'layout.openMenu': 'Open menu',
	'layout.redirecting': 'Redirecting to sign in…',

	// Sidebar
	'layout.nav.main': 'Main',
	'layout.nav.work': 'Work',
	'layout.nav.organize': 'Organize',
	'layout.nav.dashboard': 'Dashboard',
	'layout.nav.projects': 'Projects',
	'layout.nav.tasks': 'Tasks',
	'layout.nav.ideas': 'Ideas',
	'layout.nav.upcoming': 'Upcoming',
	'layout.nav.mindmap': 'MindMap',
	'layout.nav.teams': 'Teams',
	'layout.nav.labels': 'Labels',
	'layout.nav.filters': 'Saved Filters',
	'layout.nav.activity': 'Activity',
	'layout.nav.trash': 'Trash',
	'layout.nav.auditLog': 'Audit log',
	'layout.nav.admin': 'Admin',
	'layout.nav.adminOverview': 'Overview',
	'layout.nav.about': 'About',
	'layout.nav.expand': 'Expand sidebar',
	'layout.nav.collapse': 'Collapse sidebar',

	// Search
	'layout.search.placeholder': 'Search tasks & projects…',
	'layout.search.label': 'Search tasks and projects',
	'layout.search.results': 'Search results',
	'layout.search.tasks': 'Tasks',
	'layout.search.projects': 'Projects',

	// Quick add
	'layout.quickAdd.title': 'Create new…',
	'layout.quickAdd.label': 'Create new task or project',
	'layout.quickAdd.task': 'New Task',
	'layout.quickAdd.project': 'New Project',

	// Notifications (message text itself comes from the server and is not translated)
	'layout.notifications.title': 'Notifications',
	'layout.notifications.withUnread': 'Notifications, {count} unread',
	'layout.notifications.markAllRead': 'Mark all read',
	'layout.notifications.empty': 'No notifications.',
	'layout.notifications.dismiss': 'Dismiss',
	'layout.notifications.fallback': 'Notification #{id}',
	'layout.notifications.task_assigned': '{actor} assigned you to "{title}"',
	'layout.notifications.task_comment': '{actor} commented on "{title}"',
	'layout.notifications.project_added': '{actor} added you to the project "{title}"',
	'layout.notifications.project_transferred': '{actor} made you the owner of the project "{title}"',
	'layout.notifications.project_transferred_away':
		'{actor} transferred your project "{title}" to another user; you stay its Manager',
	'layout.notifications.task_reminder': 'Reminder: "{title}"',

	// User menu
	'layout.user.toggleThemeTitle': 'Toggle theme',
	'layout.user.toggleTheme': 'Toggle light/dark theme',
	'layout.user.accountMenu': 'Account menu',
	'layout.user.admin': 'Admin',
	'layout.user.teams': 'Teams',
	'layout.user.settings': 'Settings',
	'layout.user.logout': 'Logout',

	// Toast
	'layout.toast.dismiss': 'Dismiss',

	// Error page
	'layout.error.notFound': 'Page not found',
	'layout.error.forbidden': 'No access',
	'layout.error.server': 'Something went wrong',
	'layout.error.other': 'Something is not right',
	'layout.error.notFoundDetail': 'The page you are looking for does not exist or was moved.',
	'layout.error.forbiddenDetail': 'You do not have permission to open this page.',
	'layout.error.serverDetail': 'Our side hit an unexpected problem. Please try again in a moment.',
	'layout.error.otherDetail': 'The request could not be completed.',
	'layout.error.backToDashboard': 'Back to Dashboard',
	'layout.error.signIn': 'Sign in',
	'layout.error.goBack': 'Go back',

	// Legal page chrome
	'layout.legal.terms': 'Terms',
	'layout.legal.privacy': 'Privacy',
	'layout.legal.templateNoticeTitle': 'Template, not yet configured.',
	'layout.legal.templateNotice':
		'The operator has not set {nameVar} and {emailVar} when building this site, and this text has not been reviewed by a lawyer. Complete the bracketed parts and have it checked before accepting real users.'
} as const;
