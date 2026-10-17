// The home page just sends you to Pick.
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/pick');
