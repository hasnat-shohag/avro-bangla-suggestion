import { useEffect, useRef, useState } from "react";
import type React from "react";
import { getGlobalAvroWorker } from "./index";

interface UseBanglaTypingProps {
	initialText?: string;
	onTextChange?: (newText: string) => void;
	onSuggestionsChange?: (suggestions: Array<string>) => void;
	onSuggestionsHidden?: () => void;
	mode?: "bangla" | "english";
}

const DEBOUNCE_DELAY = 200;
const AvroWorker = getGlobalAvroWorker();

export function useBanglaTyping({
	initialText = "",
	onTextChange,
	onSuggestionsChange,
	onSuggestionsHidden,
	mode = "english",
}: UseBanglaTypingProps = {}) {
	const [text, setText] = useState(initialText);
	const [suggestions, setSuggestions] = useState<Array<string>>([]);
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
	const [isFocused, setIsFocused] = useState(false);

	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const suggestionsVisibleRef = useRef<boolean>(false);

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
			onSuggestionsHidden?.();
		}
	};

	const updateSuggestions = (currentWord: string) => {
		// Clear previous debounce timer
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		// Always debounce, even for empty strings - ensures consistent behavior
		debounceTimerRef.current = setTimeout(async () => {
			try {
				// Check if word is empty or just whitespace
				if (!currentWord || !currentWord.trim()) {
					hideSuggestions();
					return;
				}

				const res = await AvroWorker.getSuggestion(currentWord);
				if (res.words.length > 0) {
					setSuggestions(res.words);
					setSelectedSuggestionIndex(0);
					suggestionsVisibleRef.current = true;
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

	// Utility function to extract word boundary detection logic
	// Handles spaces, newlines, tabs, and other whitespace characters
	const getWordBoundary = (beforeCursor: string) => {
		const trimmedBeforeCursor = beforeCursor.replace(/[\s]*$/, "");
		const lastWordBoundary = trimmedBeforeCursor.search(/[\s][^\s]*$/);
		const wordStartIndex = lastWordBoundary === -1 ? 0 : lastWordBoundary + 1;
		const currentWord = beforeCursor.substring(wordStartIndex);
		
		return { wordStartIndex, currentWord };
	};

	// Utility function to clear suggestions unconditionally
	const clearSuggestions = () => {
		suggestionsVisibleRef.current = false;
		setSuggestions([]);
		setSelectedSuggestionIndex(0);
		onSuggestionsChange?.([]);
	};

	const applySuggestion = (
		suggestion: string,
		element: HTMLInputElement | HTMLTextAreaElement | null,
	) => {
		if (!element) return;

		// Get current state directly from element instead of relying on stale state
		const cursorPosition = element.selectionStart ?? 0;
		const currentValue = element.value;

		const beforeCursor = currentValue.substring(0, cursorPosition);
		const afterCursor = currentValue.substring(cursorPosition);
		
		const { wordStartIndex, currentWord } = getWordBoundary(beforeCursor);

		if (currentWord.trim()) {
			const beforeWord = beforeCursor.substring(0, wordStartIndex);
			// Apply suggestion with space after it
			const newText = beforeWord + suggestion + " " + afterCursor;
			const newCursorPos = beforeWord.length + suggestion.length + 1;

			// Update state (let React handle DOM update for controlled component)
			setText(newText);
			onTextChange?.(newText);

			// Clear suggestions immediately
			clearSuggestions();

			// Set cursor position after React updates the DOM
			setTimeout(() => {
				element.selectionStart = element.selectionEnd = newCursorPos;
				element.focus();
			}, 0);
		}
	};

	const handleKeyDown = async (
		e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		// Handle Navigation if suggestions are visible
		if (suggestionsVisibleRef.current && suggestions.length > 0) {
			if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedSuggestionIndex((prev) =>
					(prev + 1) % suggestions.length,
				);
				return;
			} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedSuggestionIndex((prev) =>
					(prev - 1 + suggestions.length) % suggestions.length,
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

		if (e.key === " " && mode !== "english") {
			e.preventDefault();

			const targetElement = e.target as HTMLInputElement | HTMLTextAreaElement;
			const cursorPosition = targetElement.selectionStart ?? 0;

			const beforeCursor = text.substring(0, cursorPosition);
			const afterCursor = text.substring(cursorPosition);

			const { wordStartIndex, currentWord } = getWordBoundary(beforeCursor);

			if (currentWord.trim()) {
				try {
					let convertedWord = currentWord;

					// Use existing suggestions if available, otherwise fetch new ones
					if (suggestions.length > 0) {
						convertedWord = suggestions[selectedSuggestionIndex]; // Use selected suggestion
					} else {
						// If no suggestions are visible (e.g. typed fast), fetch them
						const res = await AvroWorker.getSuggestion(currentWord);
						if (res.words.length > 0) {
							convertedWord = res.words[0];
						}
					}

					const beforeWord = beforeCursor.substring(0, wordStartIndex);
					const newText = beforeWord + convertedWord + " " + afterCursor;

					setText(newText);
					onTextChange?.(newText);

					const newCursorPos = beforeWord.length + convertedWord.length + 1;

					// We need to set these timeout/async updates carefully
					setTimeout(() => {
						targetElement.selectionStart = targetElement.selectionEnd =
							newCursorPos;
					}, 0);
				} catch (err) {
					console.error("Error converting word on space:", err);
					// Fallback to just adding space
					const newText = text + " ";
					setText(newText);
					onTextChange?.(newText);
				}

				// Clear suggestions
				clearSuggestions();
			} else {
				const newText = text + " ";
				setText(newText);
				onTextChange?.(newText);

				// Clear suggestions
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

		const targetElement = e.target as HTMLInputElement | HTMLTextAreaElement;
		const cursorPosition = targetElement.selectionStart ?? 0;
		const beforeCursor = newText.substring(0, cursorPosition);
		
		const { currentWord } = getWordBoundary(beforeCursor);

		if (mode === "english") {
			return;
		}

		// Always update suggestions for the current word
		updateSuggestions(currentWord);
	};

	const handlePaste = () => {
		// Allow paste to happen naturally, suggestions will be handled in handleChange
		return;
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
