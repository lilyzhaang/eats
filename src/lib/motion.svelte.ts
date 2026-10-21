// Motion settings: how the tab pill and page transitions move.
//
// DEFAULTS are what everyone gets (tuned by Lily and Andrei, Oct 21, 2026). On your Mac's dev copy, the Motion tuner
// (bottom-right corner) changes these live; tune until it feels right, press
// "Copy settings" and paste the values here to make them permanent.
//
// If someone's device asks for reduced motion, nothing animates.

import { prefersReducedMotion } from 'svelte/motion';

export const DEFAULTS = {
	/** How hard the tab pill pulls toward its new tab (higher = snappier). */
	tabStiffness: 0.15,
	/** How quickly the pill stops wobbling (lower = more bounce). */
	tabDamping: 1,
	/** How big the tab icon pops when you tap it (1 = no pop). Phone tab bar. */
	tabIconPop: 1.04,
	/** How far pages slide when you switch tabs, in pixels. */
	pageSlide: 8,
	/** How long the new page takes to arrive, in milliseconds. */
	pageDuration: 380,
	/** How much the new page overshoots before settling (0 = none). */
	pageOvershoot: 2.2,
	/** How long the old page takes to leave, in milliseconds. */
	pageExitDuration: 0,
	/** How much the new page grows in from (0.9 = from 90% size, 1 = no zoom). */
	pageScale: 1
};

export type MotionSettings = typeof DEFAULTS;

/** What each slider can go between. */
export const RANGES: Record<
	keyof MotionSettings,
	{ min: number; max: number; step: number; label: string }
> = {
	tabStiffness: { min: 0.03, max: 0.5, step: 0.01, label: 'Tab pill stiffness' },
	tabDamping: { min: 0.1, max: 1, step: 0.01, label: 'Tab pill damping' },
	tabIconPop: { min: 1, max: 1.6, step: 0.02, label: 'Tab icon pop' },
	pageSlide: { min: 0, max: 160, step: 2, label: 'Page slide distance' },
	pageDuration: { min: 0, max: 1200, step: 10, label: 'Page enter time' },
	pageOvershoot: { min: 0, max: 4, step: 0.1, label: 'Page bounce' },
	pageExitDuration: { min: 0, max: 800, step: 10, label: 'Page exit time' },
	pageScale: { min: 0.8, max: 1, step: 0.005, label: 'Page zoom-in' }
};

const STORAGE_KEY = 'eats-motion-tuning';

function saved(): Partial<MotionSettings> {
	try {
		return import.meta.env.DEV ? JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') : {};
	} catch {
		return {};
	}
}

/** The live settings. Components read these; the tuner changes them. */
export const motion: MotionSettings = $state({ ...DEFAULTS });

/** Load tuned values (dev only). Called once in the browser. */
export function loadTuning() {
	Object.assign(motion, saved());
}

/** Remember tuned values on this Mac between reloads (dev only). */
export function saveTuning() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(motion));
	} catch {
		// Private browsing etc.: tuning just won't survive a reload.
	}
}

export function resetTuning() {
	Object.assign(motion, DEFAULTS);
	saveTuning();
}

/** True when animations should be skipped. */
export function reduced(): boolean {
	return prefersReducedMotion.current;
}

/**
 * An easing curve that shoots past the end and settles back, like a soft
 * bounce. overshoot = 0 is a plain ease-out.
 */
export function overshootOut(overshoot: number) {
	return (t: number) => {
		const s = overshoot;
		const u = t - 1;
		return u * u * ((s + 1) * u + s) + 1;
	};
}
