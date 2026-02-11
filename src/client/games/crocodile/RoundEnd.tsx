import { useEffect, useState } from "react";
import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { Avatar } from "../../components/Avatar";

interface RoundEndProps {
	state: CrocodilePlayerView;
}

export function RoundEnd({ state }: RoundEndProps) {
	const [secondsLeft, setSecondsLeft] = useState(() =>
		Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000)),
	);

	useEffect(() => {
		const interval = setInterval(() => {
			setSecondsLeft(Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000)));
		}, 1000);
		return () => clearInterval(interval);
	}, [state.timerEndsAt]);

	const shower = state.players.find((p) => p.id === state.currentShowerId);
	const guessers = state.players.filter((p) => p.id !== state.currentShowerId);
	const guessedCount = state.guessedPlayerIds.length;
	const isLastRound = state.currentRound >= state.totalRounds;

	return (
		<div className="round-end">
			<h2>Раунд {state.currentRound} окончен!</h2>

			{state.currentWord && (
				<p className="revealedWord">
					Слово: <strong>{state.currentWord}</strong>
				</p>
			)}

			<p className="hint-text">Игрок {shower?.name ?? "???"} показывал</p>

			<div className="round-summary">
				<span className="counterCorrect">
					Угадали: {guessedCount} / {guessers.length}
				</span>
			</div>

			<div className="crocodile-guesser-list">
				{guessers.map((p) => {
					const guessed = state.guessedPlayerIds.includes(p.id);
					return (
						<div
							key={p.id}
							className={`crocodile-guesser-item${guessed ? " crocodile-guesser-item--guessed" : ""}`}
						>
							<Avatar seed={p.avatarSeed} size="sm" />
							<span className="crocodile-guesser-name">{p.name}</span>
							<span className={guessed ? "crocodile-guesser-check" : "crocodile-guesser-miss"}>
								{guessed ? "\u2713" : "\u2717"}
							</span>
						</div>
					);
				})}
			</div>

			<div className="round-end-footer">
				<p className="round-end-timer">{secondsLeft} сек</p>
				{isLastRound ? (
					<p className="status-text">Подведение итогов...</p>
				) : (
					<p className="status-text">Следующий раунд начинается...</p>
				)}
			</div>
		</div>
	);
}
