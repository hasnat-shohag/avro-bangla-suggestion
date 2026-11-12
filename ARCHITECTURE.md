# Architecture — avro-bangla-suggestions

## Overview

`avro-bangla-suggestions` is a React hook library for Avro Phonetic Bangla typing. It exposes a single hook (`useBanglaTyping`) and loads the heavy phonetics engine lazily from the `avro-bangla-engine` npm package.

---

## Package Structure

```
src/
├── index.tsx                  # Public API entry point
└── avro/
    ├── types.ts               # Shared TypeScript types
    ├── instance.ts            # Avro engine singleton loader
    └── useBanglaTyping.ts     # Main React hook
```

---

## Module Responsibilities

### `src/index.tsx` — Public API

Barrel file that re-exports the public surface:

```ts
export { useBanglaTyping } from "./avro/useBanglaTyping";
export type { TAvroSuggestion } from "./avro/types";
```

Nothing else is exported. Internal modules (`instance.ts`, `types.ts`) are not directly accessible to consumers.

---

### `src/avro/types.ts` — Shared Types

```ts
type TAvroSuggestion = {
  prevSelection: number;   // index of the previously committed word
  words: string[];         // suggested Bangla words
};
```

Used by `instance.ts` (return type of `getSuggestion`) and `useBanglaTyping.ts`.

---

### `src/avro/instance.ts` — Engine Singleton

**Responsibility:** Load the Avro phonetics engine once and expose a clean functional API.

#### Engine loading strategy

The engine (`avro.min.js`) lives in the separate `avro-bangla-engine` npm package and is loaded at runtime via a dynamic `import()`:

```ts
const { AvroPhonetic } = await import("avro-bangla-engine/avro.min.js");
```

Because this is a static package import, consumer bundlers can emit the engine as a same-origin JavaScript chunk. This avoids Content Security Policy failures for applications that use `script-src 'self'`.

Consumers can still provide a custom `engineUrl`, which uses:

```ts
const { AvroPhonetic } = await import(/* @vite-ignore */ engineUrl);
```

That escape hatch is intended for self-hosting or applications with an explicitly approved asset URL.

#### Singleton pattern

```
First call to ensureAvroLoaded()
  └── Creates initPromise (Promise<void>)
       └── Dynamically imports avro.min.js from npm package or custom URL
            └── Instantiates AvroPhonetic
                 └── Wires up avroSuggest / avroCommit closures

Subsequent calls → return the same initPromise (no re-import)
Failed load      → initPromise is reset, so the next call retries
```

#### Exported functions

| Function | Description |
|---|---|
| `ensureAvroLoaded()` | Triggers engine load (idempotent, returns same Promise) |
| `getSuggestion(subtext)` | Returns `TAvroSuggestion \| null` for the last word in `subtext` |
| `setCommit(queryText, bnValue)` | Submits a committed word to the engine's candidate memory |
| `isAvroLoaded()` | `true` once the engine is ready for synchronous `getSuggestion` calls |

#### Candidate memory

The user's picks (typed word → chosen suggestion) are handed to the engine on `commit` and persisted in `localStorage` under `avro-bangla-suggestions:candidate-selections`, so the engine preselects them (`prevSelection`) in later sessions. When storage is unavailable the memory lasts for the page only.

#### Engine source

Imported from `avro-bangla-engine/avro.min.js` by default and served by the consumer application. This is CSP-friendly for strict deployments.

---

### `src/avro/useBanglaTyping.ts` — React Hook

**Responsibility:** Manage text state, debounced suggestion fetching, keyboard navigation, and word commitment.

#### Props

```ts
interface UseBanglaTypingOptions {
  initialText?:          string;
  value?:                string;            // controlled text
  mode?:                 "bangla" | "english";
  onTextChange?:         (text: string) => void;
  onSuggestionsChange?:  (suggestions: string[]) => void;
  onSuggestionsHidden?:  () => void;
  engineUrl?:            string;
  navigationKeys?:       "all" | "vertical";
}
```

#### State

| State variable | Purpose |
|---|---|
| `text` | Controlled text value (sync'd with `initialText` prop) |
| `suggestions` | Current list of Bangla word candidates |
| `selectedSuggestionIndex` | Keyboard-highlighted suggestion index |
| `isFocused` | Input focus state (used to show/hide suggestion UI) |

#### Refs (mutable, no re-render)

| Ref | Purpose |
|---|---|
| `debounceTimerRef` | Timer ID for the 200 ms suggestion debounce |
| `suggestionsVisibleRef` | Whether suggestions are currently showing |
| `suggestionForWordRef` | The word that the current suggestion list was built for |

#### Data flow

```
User types
  └── handleChange()
       ├── Updates text state
       └── (bangla mode only) → updateSuggestions(currentWord)
            └── debounce 200ms
                 └── ensureAvroLoaded() → getSuggestion()
                      └── setSuggestions([...words])

User presses Space (bangla mode)
  └── handleKeyDown()
       └── Picks top suggestion or calls getSuggestion() live
            └── applySuggestion(word) → replaces current word in text

User presses Enter / Arrow keys
  └── handleKeyDown()
       └── Navigates or applies selected suggestion
```

#### Word boundary extraction

`getWordBoundary(beforeCursor)` extracts the currently typed word by finding the last whitespace boundary before the cursor position. This ensures suggestions are always computed for the in-progress word, not the full text.

#### Suggestion debounce

Suggestions are debounced by **200 ms** to avoid calling the engine on every keystroke. The timer is cleared on unmount.

---

## Build Configuration

### Vite library mode

`vite.config.ts` builds two output formats:

| Format | File | Use case |
|---|---|---|
| ES Module | `dist/index.es.js` | Modern bundlers (webpack, Vite, Rollup) |
| CommonJS | `dist/index.cjs` | `require()` consumers |

`react` and `avro-bangla-engine` are listed as **externals** — they are not bundled into the output. Consumers supply their own React, and their bundler resolves the engine from the installed `avro-bangla-engine` dependency.

### Type declarations

`vite-plugin-dts` generates `dist/index.d.ts` from the TypeScript source. The `src/main.tsx`, `src/App.tsx`, and CSS files are excluded from the declaration output since they are only used for local development.

### Sourcemaps

Disabled (`sourcemap: false`). The npm tarball contains only `dist/` (via the `files` field in `package.json`).

---

## Published Packages

| Package | Version | Contents | Size |
|---|---|---|---|
| `avro-bangla-suggestions` | 0.0.10 | Hook + types (engine not bundled) | ~7 kB tarball |
| `avro-bangla-engine` | 0.0.1 | `avro.min.js` engine | ~3.9 MB |

The engine package is installed as a dependency and stays external to this package's build; the consumer's bundler turns the dynamic `import()` into a lazy-loaded chunk. Consumers that need a different hosting model can pass `engineUrl`.
