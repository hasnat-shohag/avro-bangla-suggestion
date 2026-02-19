/**
 * Singleton Avro phonetics instance.
 * Lazily loads avro.min.js via dynamic import so consumers' bundlers
 * can code-split it — avoiding the Web Worker URL resolution problem.
 */
import type { TAvroSuggestion } from "./types";

let initPromise: Promise<void> | null = null;
let avroSuggest: (subtext: string) => TAvroSuggestion | null = () => null;
let avroCommit: (queryText: string, bnValue: string) => void = () => {};
let avroVersion: () => string = () => "";

export async function ensureAvroLoaded(): Promise<void> {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		const { AvroPhonetic } = await import("./static/avro.min.js");

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
