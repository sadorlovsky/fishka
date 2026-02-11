import type { WordGuessPlayerView } from "@/shared/types/word-guess";
import { Timer } from "../../components/Timer";
import "./WordGuess.css";
import "./RoundEnd.css";

interface WatcherViewProps {
	state: WordGuessPlayerView;
}

export function WatcherView({ state }: WatcherViewProps) {
	const explainer = state.players.find((p) => p.id === state.currentExplainerId);

	return (
		<div className="game-role-view">
			<p className="role-label">Вы угадываете</p>

			<div className="word-card word-card-hidden">
				<span className="word-text">?</span>
			</div>

			<p className="hint-text">{explainer?.name ?? "Игрок"} объясняет — слушайте и угадывайте!</p>

			<Timer endsAt={state.timerEndsAt} />

			<div className="round-counters">
				<span className="counter-correct">Угадано: {state.roundCorrectCount}</span>
				<span className="counter-skip">Пропущено: {state.roundSkipCount}</span>
			</div>

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
