import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type React from "react";
import {
	ensureAvroLoaded,
	getSuggestion,
	isAvroLoaded,
	setCommit,
} from "./instance";

type TextElement = HTMLInputElement | HTMLTextAreaElement;

export interface UseBanglaTypingOptions {
	/** Starting text when the hook owns the text (uncontrolled). */
	initialText?: string;
	/**
	 * Controlled text. When provided, the hook renders this value and reports
	 * every edit through `onTextChange`; keep it in your own state.
	 */
	value?: string;
	onTextChange?: (newText: string) => void;
	onSuggestionsChange?: (suggestions: Array<string>) => void;
	onSuggestionsHidden?: () => void;
	mode?: "bangla" | "english";
	/** Self-hosted ES module URL for the engine. Shared by all hook instances. */
	engineUrl?: string;
	/**
	 * Which arrow keys move through the suggestions while they are visible.
	 * "all" (default) uses all four; "vertical" uses only Up/Down and leaves
	 * Left/Right to move the caret.
	 */
	navigationKeys?: "all" | "vertical";
}

export interface UseBanglaTypingResult {
	text: string;
	handleChange: (e: React.ChangeEvent<TextElement>) => void;
	handleKeyDown: (e: React.KeyboardEvent<TextElement>) => void;
	suggestions: Array<string>;
	selectedSuggestionIndex: number;
	applySuggestion: (suggestion: string, element: TextElement | null) => void;
	/** No-op kept for backwards compatibility; paste is handled by `handleChange`. */
	handlePaste: () => void;
	hideSuggestions: () => void;
	handleFocus: () => void;
	handleBlur: () => void;
	isFocused: boolean;
}

const DEBOUNCE_DELAY = 200;

// useLayoutEffect warns during server rendering on React < 19.
const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;
const ENDS_WITH_BANGLA = /[ঀ-৿]$/;

// Utility: extract word at cursor boundary
const getWordBoundary = (beforeCursor: string) => {
	const trimmedBeforeCursor = beforeCursor.replace(/[\s]*$/, "");
	const lastWordBoundary = trimmedBeforeCursor.search(/[\s][^\s]*$/);
	const wordStartIndex = lastWordBoundary === -1 ? 0 : lastWordBoundary + 1;
	const currentWord = beforeCursor.substring(wordStartIndex);
	return { wordStartIndex, currentWord };
};

const getWordBeforeCursor = (element: TextElement) => {
	const beforeCursor = element.value.substring(0, element.selectionStart ?? 0);
	return getWordBoundary(beforeCursor).currentWord.trim();
};

export function useBanglaTyping({
	initialText = "",
	value,
	onTextChange,
	onSuggestionsChange,
	onSuggestionsHidden,
	mode = "english",
	engineUrl,
	navigationKeys = "all",
}: UseBanglaTypingOptions = {}): UseBanglaTypingResult {
	const [internalText, setInternalText] = useState(value ?? initialText);
	const [suggestions, setSuggestions] = useState<Array<string>>([]);
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
	const [isFocused, setIsFocused] = useState(false);

	const text = value ?? internalText;

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const suggestionsVisibleRef = useRef<boolean>(false);
	const suggestionForWordRef = useRef<string>("");
	// Bumped whenever pending suggestion work becomes stale (new keystroke,
	// suggestions cleared, unmount) so a late engine result is dropped.
	const requestIdRef = useRef(0);
	// Where the caret belongs once React has rendered an applied suggestion.
	const pendingCaretRef = useRef<{
		element: TextElement;
		text: string;
		position: number;
	} | null>(null);

	const restoreCaret = (force: boolean) => {
		const pending = pendingCaretRef.current;
		if (!pending) return;
		// Wait until the element shows the new text, or the caret would be
		// placed in the old one and jump when the text arrives.
		if (!force && pending.element.value !== pending.text) return;
		pendingCaretRef.current = null;
		if (pending.element.value === pending.text) {
			pending.element.setSelectionRange(pending.position, pending.position);
		}
		pending.element.focus();
	};

	// Runs right after each commit, before the next keystroke can be handled.
	useIsomorphicLayoutEffect(() => {
		restoreCaret(false);
	});

	// Preload the engine in the background, only once Bangla typing is wanted.
	useEffect(() => {
		if (mode !== "bangla") return;
		ensureAvroLoaded(engineUrl).catch((error: unknown) => {
			console.error("[avro-bangla-suggestions] Failed to load the Avro engine:", error);
		});
	}, [mode, engineUrl]);

	useEffect(() => {
		setInternalText(initialText);
	}, [initialText]);

	// Cleanup debounce timer on unmount
	useEffect(() => {
		return () => {
			// A counter, not a DOM node: the latest value is exactly what we want.
			// eslint-disable-next-line react-hooks/exhaustive-deps
			requestIdRef.current++;
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	const handleFocus = () => {
		setIsFocused(true);
	};

	const handleBlur = () => {
		setIsFocused(false);
	};

	const cancelPendingSuggestions = () => {
		requestIdRef.current++;
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
	};

	const hideSuggestions = () => {
		cancelPendingSuggestions();
		if (suggestionsVisibleRef.current) {
			setSuggestions([]);
			setSelectedSuggestionIndex(0);
			onSuggestionsChange?.([]);
			suggestionsVisibleRef.current = false;
			suggestionForWordRef.current = "";
			onSuggestionsHidden?.();
		}
	};

	const clearSuggestions = () => {
		cancelPendingSuggestions();
		suggestionsVisibleRef.current = false;
		suggestionForWordRef.current = "";
		setSuggestions([]);
		setSelectedSuggestionIndex(0);
		onSuggestionsChange?.([]);
	};

	const updateSuggestions = (currentWord: string) => {
		// Cancel the previous request: when the user types fast and hits space,
		// suggestions must not show up for the previous word.
		cancelPendingSuggestions();
		const requestId = requestIdRef.current;

		debounceTimerRef.current = setTimeout(async () => {
			debounceTimerRef.current = null;
			try {
				if (!currentWord || !currentWord.trim()) {
					hideSuggestions();
					return;
				}

				// Ensure avro is loaded before calling getSuggestion
				await ensureAvroLoaded(engineUrl);
				if (requestId !== requestIdRef.current) return;
				const res = getSuggestion(currentWord);

				if (res && res.words.length > 0) {
					setSuggestions(res.words);
					setSelectedSuggestionIndex(res.prevSelection);
					suggestionsVisibleRef.current = true;
					// suggestionForWordRef will ensure that the suggestion is for the current word
					suggestionForWordRef.current = currentWord.trim();
					onSuggestionsChange?.(res.words);
				} else {
					hideSuggestions();
				}
			} catch (error) {
				if (requestId !== requestIdRef.current) return;
				console.error("[avro-bangla-suggestions] Could not get suggestions:", error);
				hideSuggestions();
			}
		}, DEBOUNCE_DELAY);
	};

	const applySuggestion = (suggestion: string, element: TextElement | null) => {
		if (!element) return;

		const selectionStart = element.selectionStart ?? 0;
		const selectionEnd = Math.max(element.selectionEnd ?? selectionStart, selectionStart);
		const currentValue = element.value;
		const beforeCursor = currentValue.substring(0, selectionStart);
		// Anything selected is replaced, as it would be by normal typing.
		const afterCursor = currentValue.substring(selectionEnd);

		const { wordStartIndex, currentWord } = getWordBoundary(beforeCursor);
		const typedWord = currentWord.trim();

		if (typedWord) {
			const beforeWord = beforeCursor.substring(0, wordStartIndex);
			const newText = beforeWord + suggestion + " " + afterCursor;
			const newCursorPos = beforeWord.length + suggestion.length + 1;

			// Let the engine remember this pick so it is preselected next time.
			if (!ENDS_WITH_BANGLA.test(typedWord)) {
				setCommit(typedWord, suggestion);
			}

			setInternalText(newText);
			onTextChange?.(newText);
			clearSuggestions();

			pendingCaretRef.current = { element, text: newText, position: newCursorPos };
			// Fallback for when no render picks the caret up (e.g. the parent
			// of a controlled input ignored the change).
			setTimeout(() => restoreCaret(true), 0);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<TextElement>) => {
		if (mode !== "bangla") return;
		// Leave IME composition and keyboard shortcuts alone.
		if (e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;

		if (suggestionsVisibleRef.current && suggestions.length > 0) {
			const horizontal = navigationKeys === "all" && !e.shiftKey;
			const vertical = !e.shiftKey;
			if ((vertical && e.key === "ArrowDown") || (horizontal && e.key === "ArrowRight")) {
				e.preventDefault();
				setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
				return;
			} else if ((vertical && e.key === "ArrowUp") || (horizontal && e.key === "ArrowLeft")) {
				e.preventDefault();
				setSelectedSuggestionIndex(
					(prev) => (prev - 1 + suggestions.length) % suggestions.length,
				);
				return;
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (suggestions[selectedSuggestionIndex]) {
					applySuggestion(suggestions[selectedSuggestionIndex], e.currentTarget);
				}
				return;
			} else if (e.key === "Escape") {
				e.preventDefault();
				hideSuggestions();
				return;
			}
		}

		if (e.key === " ") {
			const targetElement = e.currentTarget;
			const beforeCursor = targetElement.value.substring(
				0,
				targetElement.selectionStart ?? 0,
			);

			if (beforeCursor.length > 0 && !/\s$/.test(beforeCursor)) {
				e.preventDefault();
				const currentWord = getWordBoundary(beforeCursor).currentWord.trim();

				if (
					suggestionsVisibleRef.current &&
					suggestions.length > 0 &&
					// suggestionForWordRef will ensure that the suggestion is for the current word
					// suppose the current word is 'ami' and suggestionForWordRef.current is 'am' then it will not match
					suggestionForWordRef.current === currentWord
				) {
					applySuggestion(suggestions[selectedSuggestionIndex], targetElement);
					return;
				}

				// No suggestions on screen for this word yet (fast typing): convert
				// directly. Re-read the word, since it may have grown while the
				// engine was still loading.
				const convert = () => {
					const word = getWordBeforeCursor(targetElement);
					if (!word) return;
					const res = getSuggestion(word);
					applySuggestion(res ? res.words[res.prevSelection] : word, targetElement);
				};

				if (isAvroLoaded()) {
					convert();
				} else {
					ensureAvroLoaded(engineUrl).then(convert, (error: unknown) => {
						console.error("[avro-bangla-suggestions] Could not convert word on space:", error);
						const word = getWordBeforeCursor(targetElement);
						if (word) applySuggestion(word, targetElement);
					});
				}
				return;
			} else {
				clearSuggestions();
			}
		}
	};

	const handleChange = (e: React.ChangeEvent<TextElement>) => {
		const newText = e.target.value;
		setInternalText(newText);
		onTextChange?.(newText);

		if (mode === "english") return;

		const cursorPosition = e.target.selectionStart ?? 0;
		const beforeCursor = newText.substring(0, cursorPosition);
		const { currentWord } = getWordBoundary(beforeCursor);
		updateSuggestions(currentWord);
	};

	const handlePaste = () => {
		// Allow paste naturally; suggestions handled in handleChange
	};

	return {
		text,
		handleChange,
		handleKeyDown,
		suggestions,
		selectedSuggestionIndex,
		applySuggestion,
		handlePaste,
		hideSuggestions,
		handleFocus,
		handleBlur,
		isFocused,
	};
}
