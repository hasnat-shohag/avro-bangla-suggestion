/**
 * Singleton Avro phonetics instance.
 *
 * Loads avro.min.js via dynamic import() from a configurable URL.
 *
 * Default URL uses jsDelivr CDN (served from the avro-bangla-engine npm package).
 * jsDelivr has global edge caching, CORS headers, and SLA-backed uptime.
 *
 * Zero-config for consumers — no setup required unless self-hosting.
 * The URL must point to the avro.min.js ES module file, which exports { AvroPhonetic }.
 */
import type { TAvroSuggestion } from "./types";

/**
 * Default engine URL.
 *
 * Served via jsDelivr from the `avro-bangla-engine` npm package.
 * Uses a pinned version for stability — update when the engine package is republished.
 *
 * Alternative GitHub CDN (no npm publish needed):
 * https://cdn.jsdelivr.net/gh/hasnat-shohag/avro-bangla-engine@v0.0.1/avro.min.js
 */
export const DEFAULT_ENGINE_URL =
  "https://cdn.jsdelivr.net/npm/avro-bangla-engine@0.0.1/avro.min.js";

let initPromise: Promise<void> | null = null;
let resolvedUrl: string | null = null;

let avroSuggest: (subtext: string) => TAvroSuggestion | null = () => null;
let avroCommit: (queryText: string, bnValue: string) => void = () => {};
let avroVersion: () => string = () => "";

export async function ensureAvroLoaded(scriptUrl?: string): Promise<void> {
	// If a new URL is provided and we haven't started yet, use it
	if (!initPromise) {
		resolvedUrl = scriptUrl ?? DEFAULT_ENGINE_URL;

		initPromise = (async () => {
			const { AvroPhonetic } = await import(/* @vite-ignore */ resolvedUrl!);

			let CandidateSelection: Record<string, unknown> = {};
			const avro = new AvroPhonetic(
				() => CandidateSelection,
				(cs: Record<string, unknown>) => {
					CandidateSelection = cs;
				},
			);

			avroSuggest = (subtext: string): TAvroSuggestion | null => {
				const res = subtext.match(/\s?([^\s]+)$/);
				if (res == null) return null;
				const bnregex = /[\u0980-\u09FF]+$/;
				if (bnregex.exec(res[1])) return null;
				const query = res[1];

				const bnarr = avro.suggest(query);
				bnarr.words = bnarr.words.slice(0, 10);
				if (avro.candidate(query) === query) {
					bnarr.prevSelection = bnarr.words.length;
				}
				bnarr.words.push(query);
				return bnarr;
			};

			avroCommit = (queryText: string, bnValue: string) => {
				avro.commit(queryText, bnValue);
			};

			avroVersion = () => avro.version;
		})();
	}

	return initPromise;
}

export function getSuggestion(subtext: string): TAvroSuggestion | null {
	return avroSuggest(subtext);
}

export function setCommit(queryText: string, bnValue: string): void {
	avroCommit(queryText, bnValue);
}

export function getVersion(): string {
	return avroVersion();
}
