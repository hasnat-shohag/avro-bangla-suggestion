/**
 * Type declarations for the bundled Avro Phonetics engine.
 * avro.min.js is the pre-built AvroPhonetic library.
 */
export declare class AvroPhonetic {
  version: string;
  constructor(
    getter: () => Record<string, unknown>,
    setter: (cs: Record<string, unknown>) => void,
  );
  suggest(queryText: string): { words: string[]; prevSelection: number };
  candidate(queryText: string): string;
  commit(queryText: string, bnValue: string): void;
}
