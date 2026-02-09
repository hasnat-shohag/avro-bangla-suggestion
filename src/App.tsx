import "./App.css";
import { useBanglaTyping } from "./avro/useBanglaTyping";
import { useState, useRef } from "react";

function App() {
	const [mode, setMode] = useState<"english" | "bangla">("english");

	const inputRef = useRef<HTMLTextAreaElement>(null);

	const {
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
	} = useBanglaTyping({ mode });

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
					minHeight: "100px",
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

export default App;
