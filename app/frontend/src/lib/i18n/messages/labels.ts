import type { Message } from '../core';

// Messages for the "labels" area. Keys are prefixed "labels." (see ../README.md).
export const en = {
	'labels.title': 'Labels',
	'labels.newPlaceholder': 'New label name',
	'labels.pickColor': 'Pick color',
	'labels.add': '+ Add Label',
	'labels.adding': 'Adding…',
	'labels.empty': 'No labels yet. Create one above.',
	'labels.confirmDelete': 'Delete this label?'
} as const;

export const cs: Record<keyof typeof en, Message> = {
	'labels.title': 'Štítky',
	'labels.newPlaceholder': 'Název nového štítku',
	'labels.pickColor': 'Vybrat barvu',
	'labels.add': '+ Přidat štítek',
	'labels.adding': 'Přidávám…',
	'labels.empty': 'Zatím žádné štítky. Vytvořte jeden výše.',
	'labels.confirmDelete': 'Smazat tento štítek?'
};
