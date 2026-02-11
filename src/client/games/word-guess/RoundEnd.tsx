import { useEffect, useState } from "react";
import type { WordGuessPlayerView } from "@/shared/types/word-guess";
import { Avatar } from "../../components/Avatar";
import "./RoundEnd.css";

function RoundEndCountdown({ endsAt }: { endsAt: number }) {
	const [secondsLeft, setSecondsLeft] = useState(() =>
		Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
	);

	useEffect(() => {
		const interval = setInterval(() => {
			setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
		}, 1000);
		return () => clearInterval(interval);
	}, [endsAt]);

	return <p className="round-end-timer">{secondsLeft} сек</p>;
}

interface RoundEndProps {
	state: WordGuessPlayerView;
	isHost: boolean;
	onNextRound: () => void;
}

export function RoundEnd({ state, isHost, onNextRound }: RoundEndProps) {
	const correctCount = state.roundResults.filter((r) => r.result === "correct").length;
	const skipCount = state.roundResults.filter((r) => r.result === "skipped").length;

	return (
		<div className="round-end">
			<h2>Раунд {state.currentRound} окончен!</h2>

			<div className="round-summary">
				<span className="counterCorrect">Угадано: {correctCount}</span>
				<span className="counterSkip">Пропущено: {skipCount}</span>
			</div>

			{state.roundResults.length > 0 && (
				<div className="round-words">
					{[...state.roundResults].reverse().map((result) => {
						const guesser = result.guesserId
							? state.players.find((p) => p.id === result.guesserId)
							: null;

						return (
							<div
								key={result.word}
								className={`round-word-item ${result.result === "correct" ? "correct" : "skipped"}`}
							>
								<span className="round-word-icon">
									{result.result === "correct" ? "\u2713" : "\u2717"}
								</span>
								<span className="round-word-text">{result.word}</span>
								{guesser && (
									<span className="round-word-guesser">
										<Avatar seed={guesser.avatarSeed} size="sm" />
										{guesser.name}
									</span>
								)}
							</div>
						);
					})}
				</div>
			)}

			<div className="round-end-footer">
				<RoundEndCountdown endsAt={state.timerEndsAt} />
				{state.currentRound < state.totalRounds ? (
					isHost ? (
						<button className="btn btn-primary" onClick={onNextRound}>
							Начать следующий раунд
						</button>
					) : (
						<p className="status-text">Следующий раунд начинается...</p>
					)
				) : (
					<p className="status-text">Подведение итогов...</p>
				)}
			</div>
		</div>
	);
}
