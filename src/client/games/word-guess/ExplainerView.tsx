import type { WordGuessPlayerView } from "@/shared/types/word-guess";
import { Timer } from "../../components/Timer";
import "./WordGuess.css";
import "./RoundEnd.css";

interface ExplainerViewProps {
	state: WordGuessPlayerView;
	dispatch: (action: unknown) => void;
}

export function ExplainerView({ state, dispatch }: ExplainerViewProps) {
	const guessers = state.players.filter((p) => p.id !== state.currentExplainerId);

	// In teams mode, only show teammates as guessers
	const currentExplainer = state.players.find((p) => p.id === state.currentExplainerId);
	const availableGuessers =
		state.mode === "teams" && currentExplainer?.teamId
			? guessers.filter((p) => p.teamId === currentExplainer.teamId)
			: guessers;

	const handleSkip = () => {
		dispatch({ type: "skip" });
	};

	const handleCorrect = (guesserId?: string) => {
		dispatch({ type: "correct", guesserId });
	};

	return (
		<div className="game-role-view">
			<p className="role-label">Вы объясняете</p>

			<div className="word-card">
				<span className="word-text">{state.currentWord}</span>
			</div>

			<p className="hint-text">Объясните слово, не называя его!</p>

			<Timer endsAt={state.timerEndsAt} />

			<div className="round-counters">
				<span className="counter-correct">Угадано: {state.roundCorrectCount}</span>
				<span className="counter-skip">Пропущено: {state.roundSkipCount}</span>
			</div>

			{state.mode === "ffa" && availableGuessers.length > 1 ? (
				<div className="guesser-picker">
					<p className="hint-text">Кто угадал?</p>
					<div className="guesser-buttons">
						{availableGuessers.map((p) => (
							<button key={p.id} className="btn btn-primary" onClick={() => handleCorrect(p.id)}>
								{p.name}
							</button>
						))}
					</div>
				</div>
			) : (
				<button className="btn btn-primary" onClick={() => handleCorrect(availableGuessers[0]?.id)}>
					Угадал!
				</button>
			)}

			<button className="btn btn-secondary" onClick={handleSkip}>
				Пропустить
			</button>

			{state.roundResults.length > 0 && (
				<div className="round-words">
					{[...state.roundResults].reverse().map((result) => (
						<div
							key={result.word}
							className={`round-word-item ${result.result === "correct" ? "correct" : "skipped"}`}
						>
							<span className="round-word-icon">
								{result.result === "correct" ? "\u2713" : "\u2717"}
							</span>
							<span className="round-word-text">{result.word}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
