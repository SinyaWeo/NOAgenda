// Messages for the "auth" area. Keys are prefixed "auth." (see ../README.md).
export const messages = {
	'auth.signInTitle': 'Sign in to your account',
	'auth.sessionExpired': 'Your session has expired. Please sign in again.',
	'auth.loginFailed': 'Login failed',
	'auth.stepUp.title': 'Confirm your password',
	'auth.stepUp.text':
		'Admin changes need your password again. You will not be asked again for a while on this device.',
	'auth.stepUp.confirm': 'Confirm',
	'auth.loadAccountFailed': 'Unable to load your account',
	'auth.unknownError': 'Unknown error',
	'auth.resend.label': 'Send the confirmation link again',
	'auth.resend.button': 'Resend',
	'auth.resend.ok': 'If that address belongs to an unverified account, we sent a new link.',
	'auth.resend.failed': 'Could not send the email. Try again in a minute.',
	'auth.emailPlaceholder': 'you@example.com',
	'auth.signIn': 'Sign in',
	'auth.signingIn': 'Signing in…',
	'auth.demo.title': 'Demo accounts',
	'auth.demo.hint':
		'Click an account to fill in the sign-in form. The demo resets every night at midnight. File uploads (attachments, avatars) are disabled.',
	'auth.demo.role.admin': 'App admin',
	'auth.demo.role.manager': 'Team manager',
	'auth.demo.role.member': 'Team member',
	'auth.demo.role.user': 'User',
	'auth.noAccount': "Don't have an account?",
	'auth.register': 'Register',
	'auth.forgotPassword': 'Forgot password?',
	'auth.terms': 'Terms',
	'auth.privacy': 'Privacy',
	'auth.languageSwitcher': 'Language',

	'auth.register.title': 'Create your account',
	'auth.register.failed': 'Registration failed',
	'auth.register.closedTitle': 'Registration is closed',
	'auth.register.closedBody':
		'New accounts cannot be created right now. If you already have an account you can sign in.',
	'auth.goToSignIn': 'Go to Sign in',
	'auth.checkEmail': 'Check your email',
	'auth.register.sentLink':
		'We sent a confirmation link to {email}. Open it to activate your account, then sign in.',
	'auth.register.inviteCode': 'Invite code',
	'auth.register.inviteHelp': 'Registration is by invitation. Enter the code you were given.',
	'auth.register.passwordHint': 'Minimum 8 characters',
	'auth.register.agreePrefix': 'I have read and agree to the',
	'auth.register.termsLink': 'Terms of Service',
	'auth.register.agreeAnd': 'and the',
	'auth.register.privacyLink': 'Privacy Policy',
	'auth.register.submit': 'Create account',
	'auth.register.submitting': 'Registering…',
	'auth.register.haveAccount': 'Already have an account?',

	'auth.reset.title': 'Reset your password',
	'auth.reset.failed': 'Request failed',
	'auth.reset.sent': "If an account exists for that address, we've sent reset instructions.",
	'auth.backToSignIn': 'Back to Sign in',
	'auth.reset.emailLabel': 'Email address',
	'auth.reset.send': 'Send reset link',
	'auth.reset.sending': 'Sending…',

	'auth.newPassword.title': 'Set a new password',
	'auth.newPassword.mismatch': 'Passwords do not match',
	'auth.newPassword.incompleteLink': 'This reset link is incomplete. Request a new one.',
	'auth.newPassword.failed': 'Reset failed',
	'auth.newPassword.success': 'Password reset successful',
	'auth.newPassword.redirecting': 'Redirecting to sign in…',
	'auth.newPassword.label': 'New Password',
	'auth.newPassword.confirm': 'Confirm Password',
	'auth.newPassword.submit': 'Reset password',
	'auth.newPassword.submitting': 'Resetting…',

	'auth.verify.pageTitle': 'Confirm email – {app}',
	'auth.verify.title': 'Confirm your email address',
	'auth.verify.incomplete': 'This confirmation link is incomplete.',
	'auth.verify.failed': 'Could not confirm your email address.',
	'auth.verify.okTitle': 'Email confirmed',
	'auth.verify.okBody': 'Thanks! You can sign in now.',
	'auth.verify.invalidTitle': 'Link not valid',
	'auth.verify.invalidBody': '{message} It may have expired or already been used.',
	'auth.verify.requestNew': 'Sign in to request a new link',

	'auth.profile.loadFailed': 'Failed to load profile.',
	'auth.profile.avatar': 'Avatar',
	'auth.profile.memberSince': 'Member since',
	'auth.profile.timezone': 'Timezone',

	'auth.about.title': 'About {app}',
	'auth.about.tagline': 'A project-focused task manager built with NestJS and SvelteKit.',
	'auth.about.version': 'Version',
	'auth.about.source': 'Source code',
	'auth.about.license': 'License',
	'auth.about.legal': 'Legal',
	'auth.about.terms': 'Terms of Service',
	'auth.about.privacy': 'Privacy Policy',
	'auth.about.timeline.heading': 'Project timeline',
	'auth.about.timeline.emailChange.title': 'Email changes confirmed first',
	'auth.about.timeline.emailChange.body':
		'A new email address takes effect only after you open the link sent to it; until then everything keeps going to the current one, and a pending change can be cancelled. The old address is told when the change goes through.',
	'auth.about.timeline.profilePage.title': 'One Profile page',
	'auth.about.timeline.profilePage.body':
		'Name, photo, email, password, language, timezone and theme are all on one Profile page in Settings, edited by clicking the value, like on a task. Terms of Service and the Privacy Policy moved to the About page.',
	'auth.about.timeline.tidyUp.title': 'Tidier pages',
	'auth.about.timeline.tidyUp.body':
		'Pages keep a comfortable maximum width on large screens, the user menu is shorter, and favorites were removed to keep things simple.',
	'auth.about.timeline.taskPage.title': 'Edit tasks in place',
	'auth.about.timeline.taskPage.body':
		'Everything on a task is edited right where it is shown: click the title, description, status, priority, dates, labels or assignee to change it. Reminders can follow the due date (a number of days before it, at a set time), attachments can be deleted, and subtasks, related tasks and comments sit on one page.',
	'auth.about.timeline.tasksByProject.title': 'Tasks grouped by project',
	'auth.about.timeline.tasksByProject.body':
		'The task list is split into sections by project, with personal tasks first, and the Kanban, Gantt and calendar views link each task to its project.',
	'auth.about.timeline.projectViews.title': 'Fixed project views and status-linked Kanban',
	'auth.about.timeline.projectViews.body':
		'Every project shows its tasks as a list, Kanban board, table, Gantt chart, calendar or mind map, with no views to set up. Kanban columns belong to the project and each stands for a status, so moving a card changes the task’s status.',
	'auth.about.timeline.singleUser.title': 'Single-user mode',
	'auth.about.timeline.singleUser.body':
		'Admins can switch an instance to one person only: teams, sharing, assignees and registration step aside, and everything becomes that admin’s.',
	'auth.about.timeline.adminTools.title': 'Project handover and admin step-up',
	'auth.about.timeline.adminTools.body':
		'Admins can hand a project to another user or take it over, also when deleting an account, and confirm admin changes with their password.',
	'auth.about.timeline.quickNotes.title': 'Quick notes and a new dashboard',
	'auth.about.timeline.quickNotes.body':
		'A reworked dashboard with quick one-line notes that you can tick off or turn into a task, project or idea.',
	'auth.about.timeline.trash.title': 'Trash and version history',
	'auth.about.timeline.trash.body':
		'Deleted projects, tasks and ideas wait in the trash for 30 days and come back with everything below them; earlier titles and descriptions can be restored.',
	'auth.about.timeline.ideas.title': 'Ideas',
	'auth.about.timeline.ideas.body':
		'A new private Ideas section for quick notes, optionally linked to a project and shareable with your teams.',
	'auth.about.timeline.calendar.title': 'Calendar view',
	'auth.about.timeline.calendar.body':
		'Tasks on a calendar in projects, on the Upcoming page and on the Dashboard.',
	'auth.about.timeline.activity.title': 'Activity log',
	'auth.about.timeline.activity.body':
		'An audit trail of who changed what on tasks and projects, with field-by-field changes, visible to anyone who can read the item and to app admins.',
	'auth.about.timeline.teams.title': 'Team roles and admin tools',
	'auth.about.timeline.teams.body':
		'Team managers and members, a separate app admin with its own team management page and sidebar section, safer account deletion for the last manager of a team.',
	'auth.about.timeline.views.title': 'Task views',
	'auth.about.timeline.views.body':
		'Kanban drag & drop, Gantt timeline, project name and priority on every task card, progress slider, assigning tasks to team members and a better MindMap.',
	'auth.about.timeline.demo.title': 'Demo and multi-instance deployment',
	'auth.about.timeline.demo.body':
		'Demo instance with nightly reset, multi-instance deployment scripts, terms and privacy pages, richer recurring tasks and version management.',
	'auth.about.timeline.branding.title': 'Branding and dark theme polish',
	'auth.about.timeline.branding.body':
		'Logo and favicons for both themes, dark theme color fixes, quote seeder and a provisioning script.',
	'auth.about.timeline.containers.title': 'Containers and open source',
	'auth.about.timeline.containers.body':
		'Frontend and backend containerization, release workflow, README, AGPL-3.0 license, demo data seeder and a single initial database migration.',
	'auth.about.timeline.automation.title': 'Automation, localization and upgrades',
	'auth.about.timeline.automation.body':
		'Webhooks, notifications, reminders, recurring tasks, Kanban buckets, task labels, uploads, English and Czech localization, user lock/unlock/delete and major dependency upgrades (NestJS 12, TypeORM 1, SvelteKit 3, Vite 8, Node 26).',
	'auth.about.timeline.hardening.title': 'Security hardening and deployment',
	'auth.about.timeline.hardening.body':
		'Security fixes, several rounds of code review fixes and deployment behind an Apache front door.',
	'auth.about.timeline.theme.title': 'Light and dark theme',
	'auth.about.timeline.theme.body': 'Cosmetic polish and a switchable light/dark theme.',
	'auth.about.timeline.ux.title': 'UX refactor',
	'auth.about.timeline.ux.body':
		'Laws of UX refactor, consistent padding and equal-height cards across the app, back and forward icons.',
	'auth.about.timeline.roles.title': 'User roles and quotes',
	'auth.about.timeline.roles.body': 'User roles with role-based access, plus inspirational quotes.',
	'auth.about.timeline.nodes.title': 'Unified nodes',
	'auth.about.timeline.nodes.body':
		'Projects and tasks merged into one generic node entity, with fixes to task and subtask creation.',
	'auth.about.timeline.flowbite.title': 'New UI foundation',
	'auth.about.timeline.flowbite.body':
		'Migration from custom CSS to Flowbite Svelte, Material icons and the first basic functionality.',
	'auth.about.timeline.start.title': 'First commit',
	'auth.about.timeline.start.body':
		'The project begins: backend modules, a shared base entity and simplified start/stop scripts.'
} as const;
