import type { Message } from '../../core';
import type { messages as en } from '../en/labels';

// Messages for the "labels" area. Keys are prefixed "labels." (see ../README.md).
export const messages: Record<keyof typeof en, Message> = {
	'labels.title': 'Štítky',
	'labels.newPlaceholder': 'Název nového štítku',
	'labels.pickColor': 'Vybrat barvu',
	'labels.add': '+ Přidat štítek',
	'labels.adding': 'Přidávám…',
	'labels.empty': 'Zatím žádné štítky. Vytvořte jeden výše.',
	'labels.confirmDelete': 'Smazat tento štítek?'
};
