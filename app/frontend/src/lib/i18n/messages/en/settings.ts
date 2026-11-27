// Messages for the "settings" area. Keys are prefixed "settings." (see ../README.md).
export const messages = {
	'settings.title': 'Settings',
	'settings.back': 'Back',
	'settings.section.profile': 'Profile',
	'settings.section.profile.desc': 'Name, photo, email, password and preferences',
	'settings.profile.title': 'Profile',
	'settings.admin': 'Admin',
	'settings.quotes.title': 'Quotes',
	'settings.quotes.desc': 'Manage motivational quotes',

	'settings.section.apiTokens': 'API Tokens',
	'settings.section.apiTokens.desc': 'Manage personal access tokens',
	'settings.section.sessions': 'Active Sessions',
	'settings.section.sessions.desc': 'View and revoke sessions',
	'settings.section.webhooks': 'Webhooks',
	'settings.section.webhooks.desc': 'Configure outgoing webhooks',
	'settings.section.channels': 'Notification channels',
	'settings.section.channels.desc': 'Get your notifications in a chat too',
	'settings.section.dataExport': 'Data Export',
	'settings.section.dataExport.desc': 'Download your data',
	'settings.section.deletion': 'Account Deletion',
	'settings.section.deletion.desc': 'Permanently delete your account',

	'settings.general.displayName': 'Display Name',

	'settings.email.intro':
		"A confirmation link will be sent to the new address. You'll need to verify it before the change takes effect.",
	'settings.email.newEmail': 'New Email Address',
	'settings.email.currentPassword': 'Current Password',
	'settings.email.sending': 'Sending…',
	'settings.email.submit': 'Update Email',
	'settings.email.sent':
		'We sent a confirmation link to {email}. Your address changes once you open it (within 24 hours).',
	'settings.email.changed': 'Email updated.',
	'settings.email.pending': 'Waiting for confirmation: {email}',
	'settings.email.cancelPending': 'Cancel change',
	'settings.email.cancelled': 'The email change was cancelled.',

	'settings.password.title': 'Change Password',
	'settings.password.show': 'Show passwords',
	'settings.password.current': 'Current Password',
	'settings.password.new': 'New Password',
	'settings.password.min': '(min 8 characters)',
	'settings.password.confirm': 'Confirm New Password',
	'settings.password.mismatch': 'Passwords do not match',
	'settings.password.updating': 'Updating…',
	'settings.password.submit': 'Update Password',
	'settings.password.done': 'Password updated.',

	'settings.tokens.title': 'API Tokens',
	'settings.tokens.created': "Token created — copy it now, it won't be shown again:",
	'settings.tokens.createTitle': 'Create New Token',
	'settings.tokens.name': 'Token Name',
	'settings.tokens.namePlaceholder': 'e.g. CI/CD token',
	'settings.tokens.expiry': 'Expiry',
	'settings.tokens.access': 'Access',
	'settings.tokens.scope.read': 'Read only (can only view data)',
	'settings.tokens.scope.write': 'Read & write',
	'settings.tokens.badge.read': 'Read only',
	'settings.tokens.badge.write': 'Read & write',
	'settings.tokens.limits':
		'API tokens can never use admin actions or account-security actions (changing your password or email, managing sessions or tokens, deleting your account), whatever access you choose.',
	'settings.tokens.meta': 'Created {created} · Expires {expires}',
	'settings.tokens.metaUsed': 'Created {created} · Expires {expires} · Last used {used}',
	'settings.tokens.never': 'Never',
	'settings.tokens.empty': 'No API tokens yet. Create one above.',

	'settings.sessions.title': 'Active Sessions',
	'settings.sessions.unknownClient': 'Unknown client',
	'settings.sessions.thisDevice': 'This device',
	'settings.sessions.meta': 'Expires: {expires}',
	'settings.sessions.metaIp': 'IP: {ip} · Expires: {expires}',
	'settings.sessions.never': 'Never',
	'settings.sessions.revoke': 'Revoke',
	'settings.sessions.empty': 'No active sessions.',

	'settings.avatar.hint': 'Click the photo to change it. JPG, PNG, GIF or WebP, max 5 MB.',
	'settings.avatar.upload': 'Upload new photo',
	'settings.avatar.failed': 'Upload failed',
	'settings.avatar.done': 'Avatar updated.',

	'settings.export.title': 'Data Export',
	'settings.export.intro':
		'Download a complete copy of your data as a JSON file: your profile, the projects and tasks you own, your comments, labels, teams, filters and settings. Passwords, tokens and secrets are never included, and attachment files are listed but not bundled.',
	'settings.export.preparing': 'Preparing…',
	'settings.export.download': 'Download my data',
	'settings.export.done': 'Your export was downloaded.',

	'settings.webhooks.title': 'Webhooks',
	'settings.webhooks.intro':
		'Receive an HTTP POST with a JSON body when selected events happen, for the projects you can access and your personal tasks. If you set a secret, each request carries an X-NOAgenda-Signature header (sha256=HMAC of the body). A webhook is switched off after 20 failed deliveries in a row.',
	'settings.webhooks.allEvents': 'All events',
	'settings.webhooks.test': 'Send test',
	'settings.webhooks.enable': 'Turn on again',
	'settings.webhooks.testOk': 'Test delivered (HTTP {status}).',
	'settings.webhooks.testFailed': 'Test failed: {error}',
	'settings.webhooks.statusOff': 'Switched off',
	'settings.webhooks.statusFailed': 'Last delivery failed',
	'settings.webhooks.statusNever': 'Nothing delivered yet',
	'settings.webhooks.addTitle': 'Add Webhook',
	'settings.webhooks.url': 'URL',
	'settings.webhooks.event': 'Event',
	'settings.webhooks.secret': 'Secret',
	'settings.webhooks.secretPlaceholder': 'HMAC signing secret',
	'settings.webhooks.creating': 'Creating…',
	'settings.webhooks.create': 'Create Webhook',
	'settings.webhooks.created': 'Webhook created.',
	'settings.webhooks.confirmDelete': 'Delete this webhook?',
	'settings.webhooks.eventLine': 'Event: {event} · {state}',
	'settings.webhooks.active': 'Active',
	'settings.webhooks.inactive': 'Inactive',
	'settings.webhooks.empty': 'No webhooks configured yet.',

	'settings.deletion.title': 'Account Deletion',
	'settings.deletion.needPassword': 'Enter your password to confirm.',
	'settings.deletion.confirm': {
		one: 'Delete your account? After {count} day your account and the projects you own will be permanently removed. You can cancel until then.',
		other:
			'Delete your account? After {count} days your account and the projects you own will be permanently removed. You can cancel until then.'
	},
	'settings.deletion.scheduled':
		'Deletion scheduled for {date}. You can still sign in and cancel until then.',
	'settings.deletion.cancelled': 'Deletion request cancelled. Your account stays as it is.',
	'settings.deletion.banner':
		'Your account is scheduled for deletion on {date}. You can still sign in and cancel until then.',
	'settings.deletion.warning': 'This will permanently delete your account',
	'settings.deletion.details': {
		one: "After a {count}-day grace period your account and the projects you own (with their tasks, comments and attachments), your labels, teams, filters and settings are permanently removed. Projects shared with you are not affected; tasks you created in other people's projects stay there without your name. Download a copy first under {link}.",
		other:
			"After a {count}-day grace period your account and the projects you own (with their tasks, comments and attachments), your labels, teams, filters and settings are permanently removed. Projects shared with you are not affected; tasks you created in other people's projects stay there without your name. Download a copy first under {link}."
	},
	'settings.deletion.confirmPassword': 'Confirm with your password',
	'settings.deletion.cancelRequest': 'Cancel Deletion Request',
	'settings.deletion.processing': 'Processing…',
	'settings.deletion.request': 'Request Account Deletion',
	'settings.section.security': 'Two-factor authentication',
	'settings.section.security.desc': 'Protect sign-in with a code from your phone',
	'settings.security.title': 'Two-factor authentication',
	'settings.security.intro':
		'With two-factor authentication on, signing in needs your password and a code from an authenticator app on your phone (for example Google Authenticator, Microsoft Authenticator, 1Password or Aegis).',
	'settings.security.statusOn': 'On since {date}',
	'settings.security.statusOff': 'Off',
	'settings.security.required':
		'Two-factor authentication is required for your account by an administrator or one of your teams, so it cannot be switched off.',
	'settings.security.demo':
		'Two-factor authentication cannot be set up on the demo: its accounts are shared.',
	'settings.security.recoveryLeft': 'Unused recovery codes: {count}',
	'settings.security.recoveryLow': 'You are running out of recovery codes. Make new ones.',
	'settings.security.start': 'Set up two-factor authentication',
	'settings.security.passwordStep': 'Enter your password to start.',
	'settings.security.continue': 'Continue',
	'settings.security.scan':
		'Scan this QR code with your authenticator app, then enter the 6-digit code it shows.',
	'settings.security.manual': 'Cannot scan it? Enter this key in the app instead:',
	'settings.security.qrLabel': 'QR code for the authenticator app',
	'settings.security.enable': 'Turn on',
	'settings.security.enabled': 'Two-factor authentication is on. Your other sessions were signed out.',
	'settings.security.codesTitle': 'Your recovery codes',
	'settings.security.codesText':
		'Keep these somewhere safe, for example in a password manager. If you lose your phone, each code lets you sign in once. They will not be shown again.',
	'settings.security.copy': 'Copy',
	'settings.security.copied': 'Recovery codes copied',
	'settings.security.download': 'Download',
	'settings.security.saved': 'I have saved them',
	'settings.security.regenerate': 'Make new recovery codes',
	'settings.security.regenerateText':
		'Enter a code from your authenticator app. Your old recovery codes stop working.',
	'settings.security.disable': 'Turn off',
	'settings.security.disableText':
		'Enter your password and a code from your authenticator app (or a recovery code).',
	'settings.security.disabled': 'Two-factor authentication is off.',
	'settings.security.gateTitle': 'Set up two-factor authentication',
	'settings.security.gateText':
		'Your account must use two-factor authentication (required by an administrator or one of your teams). Set it up to continue.',
	'settings.security.signOut': 'Sign out',
	'settings.security.fileHeading': '{app} recovery codes for {username}'
} as const;
