// Talking to Claude.
//
// One helper, askClaude(), used for both the weekly menu and the prep-day plan.
// It sends the instructions (from prompts/*.md) plus the week's details, and
// gets back data in an exact shape (checked against a Zod schema), so the
// app never has to guess at free-form text. Every request is logged in the
// ai_runs table with how many tokens it used.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { z } from 'zod';
import { ANTHROPIC_API_KEY } from '$app/env/private';
import { getDb } from '../app-db.ts';

/** The model that writes menus and plans. Claude Opus 5.5 is Anthropic's current default. */
export const MODEL = 'claude-opus-5-5';

/** Is there an API key? Without one, the Claude features stay switched off. */
export function claudeConfigured(): boolean {
	return Boolean(ANTHROPIC_API_KEY);
}

let client: Anthropic | undefined;
function getClient(): Anthropic {
	client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY });
	return client;
}

/** Read one of the instruction files in prompts/. */
export function loadPrompt(name: string): string {
	return readFileSync(resolve(process.cwd(), 'prompts', `${name}.md`), 'utf8');
}

export type RunKind = 'menu' | 'swap' | 'prep_plan';
export type Trigger = 'schedule' | 'owner' | 'lock_in';

// A request that's been "running" this long was cut off (e.g. the app restarted).
const STALE_MINUTES = 15;

/** Is a request of this kind already in progress for this week? */
export function isRunning(kind: RunKind | RunKind[], weekOf: string): boolean {
	const kinds = Array.isArray(kind) ? kind : [kind];
	const row = getDb()
		.prepare(
			`SELECT 1 FROM ai_runs
			 WHERE week_of = ? AND status = 'running'
			   AND kind IN (${kinds.map(() => '?').join(',')})
			   AND started_at > datetime('now', '-${STALE_MINUTES} minutes')`
		)
		.get(weekOf, ...kinds);
	return Boolean(row);
}

/** The most recent request of a kind for a week, for showing status on screen. */
export function latestRun(kind: RunKind | RunKind[], weekOf: string) {
	const kinds = Array.isArray(kind) ? kind : [kind];
	const row = getDb()
		.prepare(
			`SELECT status, error, started_at, finished_at,
			        (status = 'running' AND started_at <= datetime('now', '-${STALE_MINUTES} minutes')) AS stale
			 FROM ai_runs WHERE week_of = ? AND kind IN (${kinds.map(() => '?').join(',')})
			 ORDER BY id DESC LIMIT 1`
		)
		.get(weekOf, ...kinds) as
		| {
				status: string;
				error: string | null;
				started_at: string;
				finished_at: string | null;
				stale: number;
		  }
		| undefined;
	if (!row) return null;
	return {
		status: row.stale ? 'failed' : (row.status as 'running' | 'succeeded' | 'failed'),
		error: row.stale ? 'It took too long and was stopped.' : row.error
	};
}

/** Claude's answer, plus the log entry it belongs to. */
export type ClaudeResult<T> = { answer: T; runId: number };

/**
 * Ask Claude for structured data. Throws with a readable message if it fails;
 * the attempt is logged either way. The answer is kept in the log as soon as
 * it arrives (see findUnsavedAnswer).
 */
export async function askClaude<Schema extends z.ZodType>(options: {
	kind: RunKind;
	weekOf: string;
	triggeredBy: Trigger;
	prompt: string;
	details: unknown;
	schema: Schema;
}): Promise<ClaudeResult<z.infer<Schema>>> {
	if (!claudeConfigured()) {
		throw new Error('No Claude API key is set. Add ANTHROPIC_API_KEY to the settings.');
	}

	const db = getDb();
	const runId = Number(
		db
			.prepare('INSERT INTO ai_runs (kind, week_of, triggered_by, model) VALUES (?, ?, ?, ?)')
			.run(options.kind, options.weekOf, options.triggeredBy, MODEL).lastInsertRowid
	);
	// Tokens are billed even when an answer can't be used, so record them either way.
	let usage: Anthropic.Beta.BetaUsage | undefined;

	try {
		// Streaming keeps a long answer (a dozen recipes with steps) from timing out.
		const stream = getClient().beta.messages.stream({
			model: MODEL,
			max_tokens: 64000,
			thinking: { type: 'adaptive' },
			output_config: { effort: 'high', format: betaZodOutputFormat(options.schema) },
			// If Claude's safety checks ever decline (very unlikely for recipes),
			// let the API retry on its recommended fallback model.
			betas: ['server-side-fallback-2026-07-01'],
			fallbacks: 'default',
			system: options.prompt,
			messages: [{ role: 'user', content: JSON.stringify(options.details, null, 2) }]
		});
		const message = await stream.finalMessage();
		usage = message.usage;

		if (message.stop_reason === 'refusal') {
			throw new Error('Claude declined this request.');
		}
		if (message.stop_reason === 'max_tokens') {
			throw new Error('Claude’s answer was too long and got cut off.');
		}
		if (!message.parsed_output) {
			throw new Error('Claude’s answer wasn’t in the expected format.');
		}
		db.prepare(
			`UPDATE ai_runs SET status = 'succeeded', input_tokens = ?, output_tokens = ?,
			 result_json = ?, finished_at = datetime('now') WHERE id = ?`
		).run(usage.input_tokens, usage.output_tokens, JSON.stringify(message.parsed_output), runId);
		return { answer: message.parsed_output as z.infer<Schema>, runId };
	} catch (error) {
		const text = describeError(error);
		db.prepare(
			`UPDATE ai_runs SET status = 'failed', input_tokens = ?, output_tokens = ?, error = ?,
			 finished_at = datetime('now') WHERE id = ?`
		).run(usage?.input_tokens ?? null, usage?.output_tokens ?? null, text, runId);
		throw new Error(text);
	}
}

const SAVE_FAILED = 'Couldn’t save Claude’s answer: ';

/**
 * Claude answered, but the answer couldn't be used. If the answer itself was
 * fine (the problem was on the app's side), it's kept for reuse; if the
 * answer was the problem, the next try asks Claude again.
 */
export function markSaveFailed(runId: number, error: unknown, answerWasFine = true): string {
	const message = error instanceof Error ? error.message : String(error);
	const text = answerWasFine ? SAVE_FAILED + message : message;
	getDb().prepare("UPDATE ai_runs SET status = 'failed', error = ? WHERE id = ?").run(text, runId);
	return text;
}

/** The answer was put into the app (used after reusing a kept answer). */
export function markSaved(runId: number): void {
	getDb().prepare("UPDATE ai_runs SET status = 'succeeded', error = NULL WHERE id = ?").run(runId);
}

/**
 * An answer Claude already gave (and was paid for) that couldn't be saved.
 * Trying again uses it instead of asking Claude a second time.
 */
export function findUnsavedAnswer<Schema extends z.ZodType>(
	kind: RunKind,
	weekOf: string,
	schema: Schema
): ClaudeResult<z.infer<Schema>> | null {
	const row = getDb()
		.prepare(
			`SELECT id, result_json FROM ai_runs
			 WHERE kind = ? AND week_of = ? AND status = 'failed' AND result_json IS NOT NULL
			   AND error LIKE ? ORDER BY id DESC LIMIT 1`
		)
		.get(kind, weekOf, SAVE_FAILED + '%') as { id: number; result_json: string } | undefined;
	if (!row) return null;
	const parsed = schema.safeParse(JSON.parse(row.result_json));
	return parsed.success ? { answer: parsed.data, runId: row.id } : null;
}

/** Turn an error into a sentence that makes sense on screen. */
function describeError(error: unknown): string {
	if (error instanceof Anthropic.AuthenticationError) return 'The Claude API key was rejected.';
	if (error instanceof Anthropic.PermissionDeniedError)
		return 'The Claude API key isn’t allowed to do this (check credits and billing).';
	if (error instanceof Anthropic.RateLimitError)
		return 'Claude is busy right now. Try again shortly.';
	if (error instanceof Anthropic.APIConnectionError)
		return 'Couldn’t reach Claude. Check the internet connection.';
	if (error instanceof Anthropic.APIError)
		return `Claude API error ${error.status}: ${error.message}`;
	return error instanceof Error ? error.message : String(error);
}
