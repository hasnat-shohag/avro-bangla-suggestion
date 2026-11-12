# avro-bangla-suggestions

A lightweight React hook for Avro Phonetic Bangla suggestions and autocomplete.

[![npm version](https://badge.fury.io/js/avro-bangla-suggestions.svg)](https://www.npmjs.com/package/avro-bangla-suggestions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live-Demo-blue.svg)](https://avro-bangla-suggestions-demo.vercel.app/)

## Features

- 🔤 Real-time Avro phonetics-to-Bangla suggestions
- ⌨️ Keyboard navigation (Arrows + Enter)
- 🔄 Space-to-commit for auto-conversion
- 🎨 UI agnostic — bring your own suggestion list

## Installation

```bash
npm install avro-bangla-suggestions
```

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
          {suggestions.map((item: string, idx: number) => {
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

## API Reference

### `useBanglaTyping(options)`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `"bangla" \| "english"` | `"english"` | Toggle suggestions |
| `initialText` | `string` | `""` | Initial value (uncontrolled) |
| `value` | `string` | — | Controlled value; keep it in your own state and update it from `onTextChange` |
| `onTextChange` | `(text: string) => void` | — | Text change callback |
| `onSuggestionsChange` | `(suggestions: string[]) => void` | — | Called when the suggestion list changes |
| `onSuggestionsHidden` | `() => void` | — | Called when suggestions are dismissed |
| `navigationKeys` | `"all" \| "vertical"` | `"all"` | `"vertical"` leaves `←` / `→` free to move the caret |
| `engineUrl` | `string` | — | Self-hosted ES module URL for the engine (shared by all hook instances) |

### Return Values

| Value | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | Controlled value |
| `handleChange` | `Fn` | Event handler for `onChange` |
| `handleKeyDown` | `Fn` | Event handler for `onKeyDown` |
| `handleFocus` / `handleBlur` | `Fn` | Event handlers for `onFocus` / `onBlur` |
| `isFocused` | `boolean` | Whether the input has focus |
| `suggestions` | `string[]` | Current suggestion list |
| `selectedSuggestionIndex` | `number` | Highlighted suggestion; starts on your previous pick for that word |
| `applySuggestion` | `Fn(word, el)` | Apply a suggestion to the given input element |
| `hideSuggestions` | `Fn` | Dismiss the suggestion list |

The `UseBanglaTypingOptions` and `UseBanglaTypingResult` types are exported.

## Keyboard Shortcuts

- `→` / `↓` : Next suggestion
- `←` / `↑` : Previous suggestion
- `Enter` : Apply selected
- `Esc` : Dismiss suggestions
- `Space` : Auto-convert current word

## Implementation Details

- **Tiny Footprint**: The Avro engine lives in the separate `avro-bangla-engine` package and is lazy-loaded the first time Bangla mode is used.
- **Caching**: Engine is loaded once and shared across components.
- **Learns your picks**: The suggestion you choose for a word is preselected next time. Picks are saved in `localStorage` under `avro-bangla-suggestions:candidate-selections`.

---
