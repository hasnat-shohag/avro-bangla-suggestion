export type TAvroSuggestion = {
  prevSelection: number;
  words: Array<string>;
};

export type TAvroPhonetic = {
  getVersion: () => string;
  getSuggestion: (queryText: string) => TAvroSuggestion;
  setCommit: (queryText: string, bnValue: string) => void;
};
