import type { MessageKey } from './messages';
import { t } from './translate';
import type { Params } from './core';

/**
 * The backend answers in English. These tables turn the messages people actually see into the
 * current language; anything unknown is shown as the server sent it (never hidden).
 */
const EXACT: Record<string, MessageKey> = {
	'Invalid credentials, or the account is temporarily locked': 'errors.server.invalidCredentials',
	'Please verify your email address first': 'errors.server.emailNotVerified',
	'Username or email is already in use': 'errors.server.usernameOrEmailTaken',
	'Email is already in use': 'errors.server.usernameOrEmailTaken',
	'Registration is closed': 'errors.server.registrationClosed',
	'A valid invite code is required to register': 'errors.server.inviteRequired',
	'You must accept the Terms of Service and Privacy Policy to register': 'errors.server.termsRequired',
	'Incorrect current password': 'errors.server.wrongCurrentPassword',
	'Incorrect password': 'errors.server.wrongPassword',
	'Step-up required': 'errors.server.stepUpRequired',
	'Not available in single-user mode': 'errors.server.singleUserMode',
	'Single-user mode is already on': 'errors.server.singleUserOn',
	'Single-user mode is not on': 'errors.server.singleUserOff',
	'The typed username does not match the chosen user': 'errors.server.usernameMismatch',
	'The sole user must be an active admin': 'errors.server.soleUserInvalid',
	'That user already owns the project': 'errors.server.alreadyOwner',
	'The new project owner must be an active user': 'errors.server.ownerInactive',
	'Step-up needs a signed-in session': 'errors.server.stepUpRequired',
	'Invalid or expired reset token': 'errors.server.resetTokenInvalid',
	'Invalid or expired verification link': 'errors.server.verifyTokenInvalid',
	'Plugins cannot be switched on in the demo': 'errors.server.pluginsDemo',
	'This plugin is not available': 'errors.server.pluginUnavailable',
	'This chat host is not allowed on this server': 'errors.server.chatHostNotAllowed',
	'Allowed hosts must be host names separated by commas': 'errors.server.allowedHostsInvalid',
	'Save your settings first': 'errors.server.pluginSaveFirst',
	'This dependency would create a cycle': 'errors.server.dependencyCycle',
	'A task cannot start after it is due': 'errors.server.startAfterDue',
	'These tasks are already related that way': 'errors.server.relationExists',
	'This user has no pending invitation': 'errors.server.noPendingInvite',
	'Invalid refresh token': 'errors.server.sessionInvalid',
	'Session expired': 'errors.server.sessionExpired',
	'No session': 'errors.server.sessionInvalid',
	'Cannot change your own role': 'errors.server.ownRole',
	'Cannot lock your own account': 'errors.server.ownLock',
	'Cannot delete your own account': 'errors.server.ownDelete',
	'A team must keep at least one manager': 'errors.server.lastManager',
	'Only an admin can remove a manager': 'errors.server.managerRemoval',
	'That user is already in the team': 'errors.server.alreadyInTeam',
	'You already have a team with that name': 'errors.server.teamNameTaken',
	'Account is locked': 'errors.server.accountLocked',
	'Already subscribed': 'errors.server.alreadySubscribed',
	'Restore the parent first': 'errors.server.restoreParentFirst',
	'A node cannot be its own parent': 'errors.server.ownParent',
	'A node cannot be moved under its own descendant': 'errors.server.ownDescendant',
	'Invalid or too deeply nested parent': 'errors.server.badParent',
	'This API token is read-only': 'errors.server.tokenReadOnly',
	'Admin actions require an interactive login, not an API token': 'errors.server.tokenNoAdmin',
	'This action requires an interactive login, not an API token': 'errors.server.tokenNoInteractive',
	'Your storage quota is full: delete some attachments first': 'errors.server.quotaFull',
	'No file uploaded': 'errors.server.noFile',
	'The file is not a valid JPEG, PNG, GIF or WebP image': 'errors.server.badImage',
	'Avatar must be a JPEG, PNG, GIF or WebP image': 'errors.server.badImage',
	'taskId is required': 'errors.server.taskRequired',
	'No fields to update': 'errors.server.nothingToUpdate',
	'url must be a valid http(s) URL': 'errors.server.urlInvalid',
	'url must not contain a username or password': 'errors.server.urlCredentials',
	'url must point to a public address, not an internal one': 'errors.server.urlInternal',
	'An item with the same unique value already exists': 'errors.server.duplicate',
	'A referenced item does not exist': 'errors.server.missingReference',
	'A required field is missing': 'errors.server.fieldMissing',
	'A value has an invalid format': 'errors.server.valueFormat',
	'A value is out of range': 'errors.server.valueRange',
	'A value is too long': 'errors.server.valueTooLong',
	'This item is still in use and cannot be removed': 'errors.server.inUse',
	'Internal server error': 'errors.server.generic',
	'q is required (at least 3 characters)': 'errors.server.queryTooShort',
	'A project needs at least one bucket for each status': 'errors.server.lastBucketOfStatus',
	'Unknown kanban bucket': 'errors.server.unknownBucket',
	'The status does not match the kanban bucket': 'errors.server.bucketStatusMismatch',
	'Set a due date first': 'errors.server.noDueDate',
	'Give either a reminder date or days before the due date': 'errors.server.reminderKind',
	'Invalid code': 'errors.server.invalidCode',
	'The sign-in has expired, please enter your password again': 'errors.server.mfaChallengeExpired',
	'Set up two-factor authentication first': 'errors.server.mfaEnrollmentRequired',
	'Two-factor authentication is already on': 'errors.server.mfaAlreadyOn',
	'Two-factor authentication is not on': 'errors.server.mfaNotOn',
	'Start the setup first': 'errors.server.mfaStartFirst',
	'Two-factor authentication is required for your account': 'errors.server.mfaRequired',
	'Turn on two-factor authentication for your own account first': 'errors.server.mfaOwnFirst',
	'Change your own two-factor authentication in your account settings': 'errors.server.mfaOwnReset',
	'This action is disabled on the demo': 'errors.server.demoDisabled'
};

/** class-validator messages: "<field> must be ...". The field name stays as the API calls it. */
const PATTERNS: [RegExp, (m: RegExpExecArray) => [MessageKey, Params]][] = [
	[
		/^You are the only manager of: (.+)\. Delete the team or ask an admin to appoint another manager first\.$/,
		(m) => ['errors.server.onlyManagerOf', { teams: m[1] }]
	],
	[
		/^(\w+) must be longer than or equal to (\d+) characters$/,
		(m) => ['errors.validation.minLength', { field: m[1], n: m[2] }]
	],
	[
		/^(\w+) must be shorter than or equal to (\d+) characters$/,
		(m) => ['errors.validation.maxLength', { field: m[1], n: m[2] }]
	],
	[/^(\w+) must be at most (\d+) bytes/, (m) => ['errors.validation.maxBytes', { field: m[1], n: m[2] }]],
	[/^(\w+) must be an email$/, (m) => ['errors.validation.email', { field: m[1] }]],
	[/^(\w+) should not be empty$/, (m) => ['errors.validation.notEmpty', { field: m[1] }]],
	[/^(\w+) must be a string$/, (m) => ['errors.validation.string', { field: m[1] }]],
	[/^(\w+) must be an integer number$/, (m) => ['errors.validation.integer', { field: m[1] }]],
	[/^(\w+) must be a number/, (m) => ['errors.validation.number', { field: m[1] }]],
	[/^(\w+) must not be less than (\d+)$/, (m) => ['errors.validation.min', { field: m[1], n: m[2] }]],
	[/^(\w+) must not be greater than (\d+)$/, (m) => ['errors.validation.max', { field: m[1], n: m[2] }]],
	[/^(\w+) must be a valid time zone/, (m) => ['errors.validation.timezone', { field: m[1] }]],
	[
		/^(\w+) must be one of the following values: (.+)$/,
		(m) => ['errors.validation.oneOf', { field: m[1], values: m[2] }]
	],
	[/^(\w+) must be a valid ISO 8601 date string$/, (m) => ['errors.validation.date', { field: m[1] }]],
	[/^property (\w+) should not exist$/, (m) => ['errors.validation.unknownField', { field: m[1] }]]
];

/** One server message (or several joined with ", ") in the current language. */
export function localizeServerMessage(message: string): string {
	const trimmed = message.trim();
	const exact = EXACT[trimmed];
	if (exact) return t(exact);
	for (const [re, make] of PATTERNS) {
		const m = re.exec(trimmed);
		if (m) {
			const [key, params] = make(m);
			return t(key, params);
		}
	}
	// "a, b, c" from joined validation errors: translate each part that we know.
	if (trimmed.includes(', ')) {
		const parts = trimmed.split(', ');
		const done = parts.map((p) => {
			const t = localizeServerMessage(p);
			return t;
		});
		return done.join(', ');
	}
	return message;
}
