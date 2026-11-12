/**
 * Singleton Avro phonetics instance.
 *
 * Loads avro.min.js via dynamic import().
 *
 * By default, the engine is imported from the installed `avro-bangla-engine`
 * package so consumer bundlers serve it from their own origin.
 *
 * Consumers may still pass a custom URL when they want to self-host the engine.
 * The URL must point to an ES module file that exports { AvroPhonetic }.
 */
import type { TAvroSuggestion } from "./types";

type AvroEngineModule = {
	AvroPhonetic: new (
		loadCandidateSelections: () => Record<string, unknown>,
		saveCandidateSelections: (candidateSelections: Record<string, unknown>) => void,
	) => {
		suggest: (query: string) => TAvroSuggestion;
		candidate: (query: string) => string;
		commit: (queryText: string, bnValue: string) => void;
		version: string;
	};
};

export const DEFAULT_ENGINE_SOURCE = "avro-bangla-engine/avro.min.js";

let initPromise: Promise<void> | null = null;

let avroSuggest: (subtext: string) => TAvroSuggestion | null = () => null;
let avroCommit: (queryText: string, bnValue: string) => void = () => {};
let avroVersion: () => string = () => "";

async function loadEngine(scriptUrl?: string): Promise<AvroEngineModule> {
	if (scriptUrl) {
		return import(/* @vite-ignore */ scriptUrl) as Promise<AvroEngineModule>;
	}

	return import("avro-bangla-engine/avro.min.js") as Promise<AvroEngineModule>;
}

export async function ensureAvroLoaded(scriptUrl?: string): Promise<void> {
	// If a custom URL is provided and we haven't started yet, use it.
	if (!initPromise) {
		initPromise = (async () => {
			const { AvroPhonetic } = await loadEngine(scriptUrl);

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
