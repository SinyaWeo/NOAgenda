import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** Per-project views are gone (the project page has fixed tabs now); old view links open the project. */
export const load: PageLoad = ({ params }) => {
	redirect(308, `/projects/${params.id}`);
};
