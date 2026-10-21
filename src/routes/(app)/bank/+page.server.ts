// Recipe bank: everything you've cooked, plus recipes you've added. Read-only.

import type { PageServerLoad } from './$types';
import { listBank } from '#lib/server/bank.ts';

export const load: PageServerLoad = () => ({ recipes: listBank() });
