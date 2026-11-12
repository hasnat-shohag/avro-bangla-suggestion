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

type CandidateSelections = Record<string, unknown>;

type AvroEngineModule = {
	AvroPhonetic: new (
		loadCandidateSelections: () => CandidateSelections,
		saveCandidateSelections: (candidateSelections: CandidateSelections) => void,
	) => {
		suggest: (query: string) => TAvroSuggestion;
		candidate: (query: string) => string;
		commit: (queryText: string, bnValue: string) => void;
		version: string;
	};
};

const MAX_SUGGESTIONS = 10;
const STORAGE_KEY = "avro-bangla-suggestions:candidate-selections";

let initPromise: Promise<void> | null = null;
let loadedSource: string | undefined;
let loaded = false;
let warnedSourceMismatch = false;

let avroSuggest: (subtext: string) => TAvroSuggestion | null = () => null;
let avroCommit: (queryText: string, bnValue: string) => void = () => {};

// The user's past picks ("kori" -> "করই"), so the engine can preselect them.
// Storage may be unavailable (SSR, private mode, blocked site data): the
// engine then simply learns for the current page only.
function readCandidateSelections(): CandidateSelections {
	try {
		const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : null;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as CandidateSelections;
		}
	} catch {
		// fall through to an empty set
	}
	return {};
}

function writeCandidateSelections(selections: CandidateSelections): void {
	try {
		globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(selections));
	} catch {
		// in-memory only
	}
}

async function loadEngine(scriptUrl?: string): Promise<AvroEngineModule> {
	if (scriptUrl) {
		return import(/* @vite-ignore */ scriptUrl) as Promise<AvroEngineModule>;
	}

	return import("avro-bangla-engine/avro.min.js") as Promise<AvroEngineModule>;
}

/**
 * Loads the engine once and shares it across every hook instance.
 *
 * The first successful call decides where the engine comes from; a different
 * `scriptUrl` passed later is ignored. A failed load is not cached, so the next
 * call retries.
 */
export function ensureAvroLoaded(scriptUrl?: string): Promise<void> {
	if (initPromise) {
		if (scriptUrl !== loadedSource && !warnedSourceMismatch) {
			warnedSourceMismatch = true;
			console.warn(
				"[avro-bangla-suggestions] The Avro engine is shared and already loading from " +
					`${loadedSource ?? "the avro-bangla-engine package"}; ignoring engineUrl "${scriptUrl ?? ""}".`,
			);
		}
		return initPromise;
	}

	loadedSource = scriptUrl;
	const promise = (async () => {
		const { AvroPhonetic } = await loadEngine(scriptUrl);

		let candidateSelections = readCandidateSelections();
		const avro = new AvroPhonetic(
			() => candidateSelections,
			(selections) => {
				candidateSelections = selections;
				writeCandidateSelections(selections);
			},
		);

		avroSuggest = (subtext: string): TAvroSuggestion | null => {
			const res = subtext.match(/\s?([^\s]+)$/);
			if (res == null) return null;
			const bnregex = /[ঀ-৿]+$/;
			if (bnregex.exec(res[1])) return null;
			const query = res[1];

			const suggestion = avro.suggest(query);
			const words = suggestion.words.slice(0, MAX_SUGGESTIONS);
			let prevSelection = suggestion.prevSelection;
			if (avro.candidate(query) === query) {
				// The user previously kept the word as typed: preselect that entry.
				prevSelection = words.length;
			}
			words.push(query);
			if (!(prevSelection >= 0 && prevSelection < words.length)) {
				prevSelection = 0;
			}
			return { words, prevSelection };
		};

		avroCommit = (queryText: string, bnValue: string) => {
			avro.commit(queryText, bnValue);
		};

		loaded = true;
	})();

	initPromise = promise;
	promise.catch(() => {
		// Do not cache the failure: let the next call try again.
		if (initPromise === promise) {
			initPromise = null;
			loadedSource = undefined;
		}
	});

	return promise;
}

export function isAvroLoaded(): boolean {
	return loaded;
}

export function getSuggestion(subtext: string): TAvroSuggestion | null {
	return avroSuggest(subtext);
}

/** Tells the engine which suggestion the user picked for a typed word. */
export function setCommit(queryText: string, bnValue: string): void {
	avroCommit(queryText, bnValue);
}
