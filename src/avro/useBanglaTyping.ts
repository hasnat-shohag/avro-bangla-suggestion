import { useEffect, useRef, useState } from "react";
import type React from "react";
import { ensureAvroLoaded, getSuggestion } from "./instance";

interface UseBanglaTypingProps {
	initialText?: string;
	onTextChange?: (newText: string) => void;
	onSuggestionsChange?: (suggestions: Array<string>) => void;
	onSuggestionsHidden?: () => void;
	mode?: "bangla" | "english";
	engineUrl?: string;
}

const DEBOUNCE_DELAY = 200;

export function useBanglaTyping({
	initialText = "",
	onTextChange,
	onSuggestionsChange,
	onSuggestionsHidden,
	mode = "english",
	engineUrl,
}: UseBanglaTypingProps = {}) {
	const [text, setText] = useState(initialText);
	const [suggestions, setSuggestions] = useState<Array<string>>([]);
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
	const [isFocused, setIsFocused] = useState(false);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const suggestionsVisibleRef = useRef<boolean>(false);
	const suggestionForWordRef = useRef<string>("");

	// Kick off the engine load immediately in the background
	void ensureAvroLoaded(engineUrl);

	useEffect(() => {
		setText(initialText);
	}, [initialText]);

	// Cleanup debounce timer on unmount
	useEffect(() => {
		return () => {
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

	const hideSuggestions = () => {
		if (suggestionsVisibleRef.current) {
			setSuggestions([]);
			setSelectedSuggestionIndex(0);
			onSuggestionsChange?.([]);
			suggestionsVisibleRef.current = false;
			suggestionForWordRef.current = "";
			onSuggestionsHidden?.();
		}
	};

	const updateSuggestions = (currentWord: string) => {
		// clear the debounce timer if it exists, will prevent when user types fast and hit space then suggestions will not be shown for the previous word
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(async () => {
			try {
				if (!currentWord || !currentWord.trim()) {
					hideSuggestions();
					return;
				}

				// Ensure avro is loaded before calling getSuggestion
				await ensureAvroLoaded(engineUrl);
				const res = getSuggestion(currentWord);

				if (res && res.words.length > 0) {
					setSuggestions(res.words);
					setSelectedSuggestionIndex(0);
					suggestionsVisibleRef.current = true;
					// suggestionForWordRef will ensure that the suggestion is for the current word
					suggestionForWordRef.current = currentWord.trim();
					onSuggestionsChange?.(res.words);
				} else {
					hideSuggestions();
				}
			} catch (error) {
				console.error(
					"Is the text already converted, or is it originally a Bangla word?",
					error,
				);
				hideSuggestions();
			}
		}, DEBOUNCE_DELAY);
	};

	// Utility: extract word at cursor boundary
	const getWordBoundary = (beforeCursor: string) => {
		const trimmedBeforeCursor = beforeCursor.replace(/[\s]*$/, "");
		const lastWordBoundary = trimmedBeforeCursor.search(/[\s][^\s]*$/);
		const wordStartIndex = lastWordBoundary === -1 ? 0 : lastWordBoundary + 1;
		const currentWord = beforeCursor.substring(wordStartIndex);
		return { wordStartIndex, currentWord };
	};

	const clearSuggestions = () => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		suggestionsVisibleRef.current = false;
		suggestionForWordRef.current = "";
		setSuggestions([]);
		setSelectedSuggestionIndex(0);
		onSuggestionsChange?.([]);
	};

	const applySuggestion = (
		suggestion: string,
		element: HTMLInputElement | HTMLTextAreaElement | null,
	) => {
		if (!element) return;

		const cursorPosition = element.selectionStart ?? 0;
		const currentValue = element.value;
		const beforeCursor = currentValue.substring(0, cursorPosition);
		const afterCursor = currentValue.substring(cursorPosition);

		const { wordStartIndex, currentWord } = getWordBoundary(beforeCursor);

		if (currentWord.trim()) {
			const beforeWord = beforeCursor.substring(0, wordStartIndex);
			const newText = beforeWord + suggestion + " " + afterCursor;
			const newCursorPos = beforeWord.length + suggestion.length + 1;

			setText(newText);
			onTextChange?.(newText);
			clearSuggestions();

			setTimeout(() => {
				element.selectionStart = element.selectionEnd = newCursorPos;
				element.focus();
			}, 0);
		}
	};

	const handleKeyDown = async (
		e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		if (suggestionsVisibleRef.current && suggestions.length > 0) {
			if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedSuggestionIndex((prev) => (prev + 1) % suggestions.length);
				return;
			} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedSuggestionIndex(
					(prev) => (prev - 1 + suggestions.length) % suggestions.length,
				);
				return;
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (suggestions[selectedSuggestionIndex]) {
					applySuggestion(
						suggestions[selectedSuggestionIndex],
						e.currentTarget as HTMLInputElement | HTMLTextAreaElement,
					);
				}
				return;
			}
		}

		if (e.key === " " && mode === "bangla") {
			const targetElement = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
			const currentValue = targetElement.value;
			const cursorPosition = targetElement.selectionStart ?? 0;
			const beforeCursor = currentValue.substring(0, cursorPosition);

			if (beforeCursor.length > 0 && !/\s$/.test(beforeCursor)) {
				e.preventDefault();
				const { currentWord } = getWordBoundary(beforeCursor);
				let convertedWord = currentWord.trim();

				if (
					suggestionsVisibleRef.current &&
					suggestions.length > 0 &&
					// suggestionForWordRef will ensure that the suggestion is for the current word
					// suppose the current word is 'ami' and suggestionForWordRef.current is 'am' then it will not match 
					suggestionForWordRef.current === currentWord.trim()
				) {
					convertedWord = suggestions[selectedSuggestionIndex];
				} else {
					try {
						await ensureAvroLoaded(engineUrl);
						const res = getSuggestion(currentWord.trim());
						if (res && res.words.length > 0) {
							convertedWord = res.words[0];
						}
					} catch (err) {
						console.error("Error converting word on space:", err);
					}
				}

				applySuggestion(convertedWord, targetElement);
				return;
			} else {
				clearSuggestions();
			}
		}
	};

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const newText = e.target.value;
		setText(newText);
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
