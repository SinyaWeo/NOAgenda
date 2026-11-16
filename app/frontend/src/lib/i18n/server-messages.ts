import type { MessageKey } from './messages';
import { tr } from './translate';
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
	'Invalid or expired reset token': 'errors.server.resetTokenInvalid',
	'Invalid or expired verification link': 'errors.server.verifyTokenInvalid',
	'Invalid refresh token': 'errors.server.sessionInvalid',
	'Session expired': 'errors.server.sessionExpired',
	'No session': 'errors.server.sessionInvalid',
	'Cannot change your own role': 'errors.server.ownRole',
	'Already subscribed': 'errors.server.alreadySubscribed',
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
};

/** class-validator messages: "<field> must be ...". The field name stays as the API calls it. */
const PATTERNS: [RegExp, (m: RegExpExecArray) => [MessageKey, Params]][] = [
	[/^(\w+) must be longer than or equal to (\d+) characters$/, (m) => ['errors.validation.minLength', { field: m[1], n: m[2] }]],
	[/^(\w+) must be shorter than or equal to (\d+) characters$/, (m) => ['errors.validation.maxLength', { field: m[1], n: m[2] }]],
	[/^(\w+) must be at most (\d+) bytes/, (m) => ['errors.validation.maxBytes', { field: m[1], n: m[2] }]],
	[/^(\w+) must be an email$/, (m) => ['errors.validation.email', { field: m[1] }]],
	[/^(\w+) should not be empty$/, (m) => ['errors.validation.notEmpty', { field: m[1] }]],
	[/^(\w+) must be a string$/, (m) => ['errors.validation.string', { field: m[1] }]],
	[/^(\w+) must be an integer number$/, (m) => ['errors.validation.integer', { field: m[1] }]],
	[/^(\w+) must be a number/, (m) => ['errors.validation.number', { field: m[1] }]],
	[/^(\w+) must not be less than (\d+)$/, (m) => ['errors.validation.min', { field: m[1], n: m[2] }]],
	[/^(\w+) must not be greater than (\d+)$/, (m) => ['errors.validation.max', { field: m[1], n: m[2] }]],
	[/^(\w+) must be a valid time zone/, (m) => ['errors.validation.timezone', { field: m[1] }]],
	[/^(\w+) must be one of the following values: (.+)$/, (m) => ['errors.validation.oneOf', { field: m[1], values: m[2] }]],
	[/^(\w+) must be a valid ISO 8601 date string$/, (m) => ['errors.validation.date', { field: m[1] }]],
	[/^property (\w+) should not exist$/, (m) => ['errors.validation.unknownField', { field: m[1] }]],
];

/** One server message (or several joined with ", ") in the current language. */
export function localizeServerMessage(message: string): string {
	const trimmed = message.trim();
	const exact = EXACT[trimmed];
	if (exact) return tr(exact);
	for (const [re, make] of PATTERNS) {
		const m = re.exec(trimmed);
		if (m) {
			const [key, params] = make(m);
			return tr(key, params);
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
