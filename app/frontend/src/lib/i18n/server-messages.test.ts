import { beforeEach, describe, expect, it } from 'vitest';
import { locale } from './locale-store';
import { localizeServerMessage } from './server-messages';

describe('localizeServerMessage', () => {
	beforeEach(() => locale.set('cs'));

	it('translates messages the backend really sends', () => {
		expect(localizeServerMessage('Invalid credentials, or the account is temporarily locked')).toBe(
			'Neplatné přihlašovací údaje, nebo je účet dočasně uzamčen'
		);
		expect(localizeServerMessage('Username or email is already in use')).toBe(
			'Uživatelské jméno nebo e‑mail už se používá'
		);
		expect(localizeServerMessage('This API token is read-only')).toBe('Tento API token je jen pro čtení');
	});

	it('translates class-validator messages and keeps the field name', () => {
		expect(localizeServerMessage('password must be longer than or equal to 8 characters')).toBe(
			'password: minimální délka je 8 znaků'
		);
		expect(localizeServerMessage('email must be an email')).toBe('email: zadejte platnou e‑mailovou adresu');
		expect(localizeServerMessage('name should not be empty')).toBe('name: nesmí být prázdné');
		expect(localizeServerMessage('priority must not be greater than 5')).toBe('priority: musí být nejvýše 5');
		expect(localizeServerMessage('status must be one of the following values: open, in_progress, done')).toBe(
			'status: povolené hodnoty jsou open, in_progress, done'
		);
	});

	it('translates several joined messages one by one', () => {
		expect(localizeServerMessage('name should not be empty, email must be an email')).toBe(
			'name: nesmí být prázdné, email: zadejte platnou e‑mailovou adresu'
		);
	});

	it('shows an unknown message exactly as the server sent it', () => {
		expect(localizeServerMessage('Something brand new')).toBe('Something brand new');
	});

	it('uses English when the language is English', () => {
		locale.set('en');
		expect(localizeServerMessage('password must be longer than or equal to 8 characters')).toBe(
			'password must be at least 8 characters'
		);
	});
});
