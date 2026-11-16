import type { Message } from '../core';
import * as common from './common';
import * as layout from './layout';
import * as auth from './auth';
import * as dashboard from './dashboard';
import * as tasks from './tasks';
import * as projects from './projects';
import * as views from './views';
import * as filters from './filters';
import * as teams from './teams';
import * as labels from './labels';
import * as settings from './settings';
import * as admin from './admin';
import * as legal from './legal';
import * as errors from './errors';

/** English is the source of truth: every key must exist here and in Czech (checked by svelte-check). */
export const en = {
	...common.en, ...layout.en, ...auth.en, ...dashboard.en, ...tasks.en, ...projects.en, ...views.en,
	...filters.en, ...teams.en, ...labels.en, ...settings.en, ...admin.en, ...legal.en, ...errors.en,
} as const;

export type MessageKey = keyof typeof en;

export const cs: Record<MessageKey, Message> = {
	...common.cs, ...layout.cs, ...auth.cs, ...dashboard.cs, ...tasks.cs, ...projects.cs, ...views.cs,
	...filters.cs, ...teams.cs, ...labels.cs, ...settings.cs, ...admin.cs, ...legal.cs, ...errors.cs,
};
