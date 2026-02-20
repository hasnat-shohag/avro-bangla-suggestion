# avro-bangla-suggestions

A lightweight React hook providing **Avro phonetics-based Bangla typing suggestions** — drop it into any React or Next.js project to get instant Bangla word suggestions as users type in English phonetics.

[![npm version](https://badge.fury.io/js/avro-bangla-suggestions.svg)](https://www.npmjs.com/package/avro-bangla-suggestions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://www.npmjs.com/package/avro-bangla-suggestions?activeTab=code)

---

## Features

- 🔤 Avro phonetics-to-Bangla suggestions in real time
- ⌨️ Keyboard navigation (Arrow keys + Enter to select)
- 🔄 Space-to-commit: pressing space auto-converts the current word
- 🧵 Web Worker powered — phonetics processing happens off the main thread
- 🌐 Works with `<input>` and `<textarea>` elements
- 📦 Zero UI dependencies — bring your own suggestion UI

---

## Installation

```bash
npm install avro-bangla-suggestions
# or
yarn add avro-bangla-suggestions
# or
pnpm add avro-bangla-suggestions
```
---

## Quick Start

```tsx
import { useRef, useState } from "react";
import { useBanglaTyping } from "avro-bangla-suggestions";

export default function BanglaInput() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"bangla" | "english">("bangla");

  const {
    text,
    handleChange,
    handleKeyDown,
    handlePaste,
    handleFocus,
    handleBlur,
    suggestions,
    selectedSuggestionIndex,
    applySuggestion,
    isFocused,
  } = useBanglaTyping({ mode });

  return (
    <div style={{ position: "relative" }}>
      <textarea
        ref={inputRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      {/* Suggestion dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div style={{ display: "flex", gap: 4, position: "absolute" }}>
          {suggestions.map((word, idx) => (
            <button
              key={idx}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                applySuggestion(word, inputRef.current);
              }}
              style={{
                background: selectedSuggestionIndex === idx ? "#7c3aed" : "#f3f4f6",
                color: selectedSuggestionIndex === idx ? "#fff" : "#374151",
              }}
            >
              {word}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## `useBanglaTyping` API

### Parameters

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `"bangla" \| "english"` | `"english"` | Enable Bangla suggestions only when `"bangla"` |
| `initialText` | `string` | `""` | Initial value of the text state |
| `onTextChange` | `(text: string) => void` | — | Called whenever the text changes |
| `onSuggestionsChange` | `(suggestions: string[]) => void` | — | Called when the suggestion list updates |
| `onSuggestionsHidden` | `() => void` | — | Called when suggestions are dismissed |

### Returns

| Name | Type | Description |
|------|------|-------------|
| `text` | `string` | Current text value (use as controlled `value`) |
| `handleChange` | `ChangeEventHandler` | Attach to `onChange` |
| `handleKeyDown` | `KeyboardEventHandler` | Attach to `onKeyDown` |
| `handlePaste` | `ClipboardEventHandler` | Attach to `onPaste` |
| `handleFocus` | `() => void` | Attach to `onFocus` |
| `handleBlur` | `() => void` | Attach to `onBlur` |
| `suggestions` | `string[]` | Current suggestion list |
| `selectedSuggestionIndex` | `number` | Index of the highlighted suggestion |
| `applySuggestion` | `(word: string, el: HTMLInputElement \| HTMLTextAreaElement \| null) => void` | Call on suggestion click |
| `isFocused` | `boolean` | Whether the input is focused |
| `hideSuggestions` | `() => void` | Programmatically dismiss suggestions |

### Keyboard Shortcuts (Bangla mode)

| Key | Action |
|-----|--------|
| `→` / `↓` | Select next suggestion |
| `←` / `↑` | Select previous suggestion |
| `Enter` | Apply selected suggestion |
| `Space` | Auto-convert and commit current word |

---

## TypeScript Types

```ts
import type { TAvroSuggestion, TAvroPhonetic } from "avro-bangla-suggestions";
```

---

## Advanced: Worker Utilities

If you need direct access to the Avro worker:

```ts
import { initAvroWorker, getGlobalAvroWorker } from "avro-bangla-suggestions";

// Create a new instance (useful if you need isolated state)
const worker = initAvroWorker();
const result = await worker.getSuggestion("ami");

// Or use the shared singleton
const sharedWorker = getGlobalAvroWorker();
```

---

## License

[MIT](https://www.npmjs.com/package/avro-bangla-suggestions?activeTab=code) © Hasnat Shohag
