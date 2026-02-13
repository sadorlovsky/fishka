import { useCallback, useState } from "react";

interface TextGuessInputProps {
	dispatch: (action: unknown) => void;
	disabled?: boolean;
	placeholder?: string;
}

export function TextGuessInput({ dispatch, disabled, placeholder }: TextGuessInputProps) {
	const [word, setWord] = useState("");

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const filtered = e.target.value.replace(/[^a-zA-Zа-яёА-ЯЁ\- ]/g, "");
		setWord(filtered);
	}, []);

	const handleSubmit = useCallback(() => {
		const trimmed = word.trim();
		if (!trimmed) {
			return;
		}
		dispatch({ type: "guess", word: trimmed.toLowerCase() });
		setWord("");
	}, [word, dispatch]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				handleSubmit();
			}
		},
		[handleSubmit],
	);

	return (
		<div className="text-guess">
			<input
				className="input"
				type="text"
				value={word}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				placeholder={placeholder ?? "Введите ваш ответ..."}
				disabled={disabled}
				autoComplete="off"
			/>
			<button
				className="btn btn-primary"
				onClick={handleSubmit}
				disabled={disabled || !word.trim()}
			>
				Ответить
			</button>
		</div>
	);
}
