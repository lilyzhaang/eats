// How pages arrive and leave when you switch tabs.
//
// dir = 1 when moving to a tab further right (the new page comes in from the
// right and the old one leaves to the left), -1 for the other way.
// The numbers come from the motion settings (see motion.svelte.ts).

import type { TransitionConfig } from 'svelte/transition';
import { motion, overshootOut, reduced } from './motion.svelte.ts';

export function pageIn(_node: Element, { dir }: { dir: number }): TransitionConfig {
	if (reduced()) return { duration: 0 };
	const { pageSlide, pageDuration, pageOvershoot, pageScale } = motion;
	return {
		duration: pageDuration,
		easing: overshootOut(pageOvershoot),
		// t runs 0 → 1 (and briefly past 1 for the bounce); u = 1 - t.
		css: (t, u) => `
			transform: translateX(${dir * pageSlide * u}px) scale(${pageScale + (1 - pageScale) * t});
			opacity: ${Math.min(1, t * 1.8)};
		`
	};
}

export function pageOut(_node: Element, { dir }: { dir: number }): TransitionConfig {
	if (reduced()) return { duration: 0 };
	const { pageSlide, pageExitDuration } = motion;
	return {
		duration: pageExitDuration,
		// t runs 1 → 0 as it leaves.
		css: (t, u) => `
			transform: translateX(${-dir * pageSlide * 0.6 * u}px);
			opacity: ${t};
		`
	};
}
