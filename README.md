# avro-bangla-suggestions

A lightweight React hook for Avro Phonetic Bangla suggestions and autocomplete. Easily integrate Bengali phonetic typing into your web applications.

[![npm version](https://badge.fury.io/js/avro-bangla-suggestions.svg)](https://www.npmjs.com/package/avro-bangla-suggestions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://www.npmjs.com/package/avro-bangla-suggestions?activeTab=code)
[![Live Demo](https://img.shields.io/badge/Live-Demo-blue.svg)](https://avro-bangla-suggestions-demo.vercel.app/)

---

## Features

- 🔤 Avro phonetics-to-Bangla suggestions in real time
- ⌨️ Keyboard navigation (Arrow keys + Enter to select)
- 🔄 Space-to-commit: pressing space auto-converts the current word
- 📦 **Tiny package** (~7 KB) — the Avro engine loads from CDN at runtime
- 🌐 Works with `<input>` and `<textarea>` elements
- 🎨 Zero UI dependencies — bring your own suggestion UI

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
    hideSuggestions,
    isFocused,
  } = useBanglaTyping({ mode });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "1000px",
        justifyContent: "center",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      <button
        onClick={() => {
          setMode(mode === "english" ? "bangla" : "english");
          hideSuggestions();
        }}
      >
        Switch to {mode === "english" ? "Bangla" : "English"}
      </button>
      <textarea
        ref={inputRef}
        style={{
          position: "relative",
          minHeight: "200px",
          width: "600px",
          resize: "none",
          overflow: "auto",
        }}
        onKeyDown={handleKeyDown}
        value={text}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {/* User instructions */}
      <div
        style={{
          border: "1px solid #ffffff",
          borderRadius: "6px",
          padding: "8px 12px",
          maxWidth: "600px",
          fontSize: "12px",
          color: "#ffffff",
          lineHeight: "1.4",
        }}
      >
        <strong>→/↓ Next</strong> | <strong>←/↑ Prev</strong> |{" "}
        <strong>Enter</strong> Apply | <strong>Space</strong> Auto-convert |{" "}
        <strong>Click</strong> suggestion
      </div>
      {isFocused && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            marginTop: "4px",
            marginBottom: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            overflowX: "auto",
            overflowY: "hidden",
            borderRadius: "6px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            padding: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            maxWidth: "100%",
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur
        >
          {suggestions.map((item, idx) => {
            const isSelected = selectedSuggestionIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  applySuggestion(item, inputRef.current);
                }}
                style={{
                  flexShrink: 0,
                  borderRadius: "6px",
                  padding: "4px 12px",
                  fontSize: "14px",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                  border: "none",
                  cursor: "pointer",
                  background: isSelected ? "#7c3aed" : "#f3f4f6",
                  color: isSelected ? "#ffffff" : "#374151",
                  boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                }}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## `useBanglaTyping` API

### Parameters

| Prop                  | Type                              | Default     | Description                                    |
| --------------------- | --------------------------------- | ----------- | ---------------------------------------------- |
| `mode`                | `"bangla" \| "english"`           | `"english"` | Enable Bangla suggestions only when `"bangla"` |
| `initialText`         | `string`                          | `""`        | Initial value of the text state                |
| `onTextChange`        | `(text: string) => void`          | —           | Called whenever the text changes               |
| `onSuggestionsChange` | `(suggestions: string[]) => void` | —           | Called when the suggestion list updates        |
| `onSuggestionsHidden` | `() => void`                      | —           | Called when suggestions are dismissed          |

### Returns

| Name                      | Type                                                                          | Description                                    |
| ------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| `text`                    | `string`                                                                      | Current text value (use as controlled `value`) |
| `handleChange`            | `ChangeEventHandler`                                                          | Attach to `onChange`                           |
| `handleKeyDown`           | `KeyboardEventHandler`                                                        | Attach to `onKeyDown`                          |
| `handlePaste`             | `ClipboardEventHandler`                                                       | Attach to `onPaste`                            |
| `handleFocus`             | `() => void`                                                                  | Attach to `onFocus`                            |
| `handleBlur`              | `() => void`                                                                  | Attach to `onBlur`                             |
| `suggestions`             | `string[]`                                                                    | Current suggestion list                        |
| `selectedSuggestionIndex` | `number`                                                                      | Index of the highlighted suggestion            |
| `applySuggestion`         | `(word: string, el: HTMLInputElement \| HTMLTextAreaElement \| null) => void` | Call on suggestion click                       |
| `isFocused`               | `boolean`                                                                     | Whether the input is focused                   |
| `hideSuggestions`         | `() => void`                                                                  | Programmatically dismiss suggestions           |

### Keyboard Shortcuts (Bangla mode)

| Key       | Action                               |
| --------- | ------------------------------------ |
| `→` / `↓` | Select next suggestion               |
| `←` / `↑` | Select previous suggestion           |
| `Enter`   | Apply selected suggestion            |
| `Space`   | Auto-convert and commit current word |
| `Click`   | Apply any suggestion                 |

---

## Engine Loading

The Avro phonetics engine (`avro.min.js`) is **not bundled** in this package — it loads at runtime from a URL. This keeps the package size tiny (~7 KB).

### Default (zero-config): jsDelivr CDN

By default, the engine loads automatically from:
```
https://cdn.jsdelivr.net/npm/avro-bangla-engine@0.0.1/avro.min.js
```

**No setup required.** The engine is loaded once and cached for the page's lifetime.

> jsDelivr has global edge caching, automatic CORS headers, and excellent uptime — safe for production use as-is.

### Self-host (optional, for production environments without CDN access)

Copy `avro.min.js` to your `public/` folder and pass its local URL:

```bash
cp node_modules/avro-bangla-engine/avro.min.js public/avro.min.js
```

```tsx
useBanglaTyping({
  mode: "bangla",
  avroScriptUrl: "/avro.min.js",
});
```

---

## TypeScript Types

```ts
import type { TAvroSuggestion } from "avro-bangla-suggestions";
```

---
