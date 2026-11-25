import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Tasks are edited in place on their Details tab now; old edit links open the task. */
export const load: PageLoad = ({ params }) => {
	redirect(308, `/tasks/${params.id}`);
};
