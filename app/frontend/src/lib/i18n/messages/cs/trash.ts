import type { Message } from '../../core';
import type { messages as en } from '../en/trash';

// Messages for the "trash" area. Keys are prefixed "trash." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
	'trash.title': 'Koš',
	'trash.hint':
		'Smazané úkoly, projekty a nápady zůstávají tady, dokud se automaticky neodstraní. Obnovením se vrátí i vše, co se s nimi smazalo.',
	'trash.empty': 'Koš je prázdný.',
	'trash.loadFailed': 'Koš se nepodařilo načíst.',
	'trash.type.task': 'Úkol',
	'trash.type.project': 'Projekt',
	'trash.type.idea': 'Nápad',
	'trash.deletedAt': 'Smazáno {when}',
	'trash.untitled': 'bez názvu',
	'trash.deleted': 'Smazáno {when}, smazal(a) {who}',
	'trash.purgeAt': 'Trvale se odstraní {when}',
	'trash.restore': 'Obnovit',
	'trash.restored': 'Obnoveno',
	'trash.restoreFailed': 'Obnovení se nezdařilo',
	'trash.purge': 'Smazat trvale',
	'trash.purged': 'Trvale smazáno',
	'trash.purgeFailed': 'Smazání se nezdařilo',
	'trash.confirmPurge': 'Trvale smazat „{title}“? Tuto akci nelze vrátit zpět.'
};
