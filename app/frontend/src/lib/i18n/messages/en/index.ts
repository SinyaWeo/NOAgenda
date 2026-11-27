import { messages as activity } from './activity';
import { messages as admin } from './admin';
import { messages as auth } from './auth';
import { messages as common } from './common';
import { messages as dashboard } from './dashboard';
import { messages as errors } from './errors';
import { messages as filters } from './filters';
import { messages as ideas } from './ideas';
import { messages as labels } from './labels';
import { messages as layout } from './layout';
import { messages as legal } from './legal';
import { messages as plugins } from './plugins';
import { messages as projects } from './projects';
import { messages as settings } from './settings';
import { messages as tasks } from './tasks';
import { messages as teams } from './teams';
import { messages as trash } from './trash';
import { messages as views } from './views';

/** English is the source of truth: every key must exist here and in Czech (checked by svelte-check). */
export const en = {
	...activity,
	...admin,
	...auth,
	...common,
	...dashboard,
	...errors,
	...filters,
	...ideas,
	...labels,
	...layout,
	...legal,
	...plugins,
	...projects,
	...settings,
	...tasks,
	...teams,
	...trash,
	...views
} as const;
