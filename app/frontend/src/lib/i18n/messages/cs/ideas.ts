import type { Message } from '../../core';
import type { messages as en } from '../en/ideas';

// Messages for the "ideas" area. Keys are prefixed "ideas." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
	'ideas.title': 'Nápady',
	'ideas.subtitle': 'Soukromé poznámky. Vidíte je jen vy, dokud některou nasdílíte týmu.',
	'ideas.newPlaceholder': 'Zapište nápad…',
	'ideas.project': 'Projekt',
	'ideas.noProject': 'Bez projektu',
	'ideas.add': '+ Přidat nápad',
	'ideas.adding': 'Přidávám…',
	'ideas.empty': 'Zatím žádné nápady. Zapište první výše.',
	'ideas.confirmDelete': 'Smazat tento nápad?',
	'ideas.sharedBy': 'Sdílí {name}',
	'ideas.share': 'Sdílet',
	'ideas.shareWith': 'Sdílet s týmy',
	'ideas.noTeams': 'Nejste členem žádného týmu.',
	'ideas.sharedWithCount': {
		one: 'Sdíleno s {count} týmem',
		few: 'Sdíleno s {count} týmy',
		many: 'Sdíleno s {count} týmy',
		other: 'Sdíleno s {count} týmy'
	}
};
