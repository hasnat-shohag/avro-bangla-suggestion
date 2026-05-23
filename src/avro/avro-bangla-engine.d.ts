declare module "avro-bangla-engine/avro.min.js" {
	import type { TAvroSuggestion } from "./types";

	export class AvroPhonetic {
		constructor(
			loadCandidateSelections: () => Record<string, unknown>,
			saveCandidateSelections: (
				candidateSelections: Record<string, unknown>,
			) => void,
		);

		suggest(query: string): TAvroSuggestion;
		candidate(query: string): string;
		commit(queryText: string, bnValue: string): void;
		version: string;
	}
}
