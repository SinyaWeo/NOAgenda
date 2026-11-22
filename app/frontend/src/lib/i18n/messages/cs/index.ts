import type { Message } from '../../core';
import type { MessageKey } from '..';
import { messages as activity } from './activity';
import { messages as admin } from './admin';
import { messages as auth } from './auth';
import { messages as common } from './common';
import { messages as dashboard } from './dashboard';
import { messages as errors } from './errors';
import { messages as filters } from './filters';
import { messages as labels } from './labels';
import { messages as layout } from './layout';
import { messages as legal } from './legal';
import { messages as projects } from './projects';
import { messages as settings } from './settings';
import { messages as tasks } from './tasks';
import { messages as teams } from './teams';
import { messages as views } from './views';

export const cs: Record<MessageKey, Message> = {
	...activity,
	...admin,
	...auth,
	...common,
	...dashboard,
	...errors,
	...filters,
	...labels,
	...layout,
	...legal,
	...projects,
	...settings,
	...tasks,
	...teams,
	...views
};
