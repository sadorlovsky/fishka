import { useEffect, useState } from "react";
import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { PlayerChip } from "../../components/PlayerChip";

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
	const guesserId = state.guessedPlayerIds[0];
	const guesser = guesserId ? state.players.find((p) => p.id === guesserId) : null;
	const isLastRound = state.currentRound >= state.totalRounds;

	return (
		<div className="round-end">
			<h2>Раунд {state.currentRound} окончен!</h2>

			{state.currentWord && (
				<p className="revealedWord">
					Слово: <strong>{state.currentWord}</strong>
				</p>
			)}

			<p className="hint-text">
				Игрок {shower?.name ?? "???"} {state.mode === "drawing" ? "рисовал" : "показывал"}
			</p>

			{guesser ? (
				<div className="round-summary">
					<span className="counterCorrect">Угадал:</span>
					<PlayerChip avatarSeed={guesser.avatarSeed} name={guesser.name}>
						<span className="crocodile-guesser-check">{"\u2713"}</span>
					</PlayerChip>
				</div>
			) : (
				<div className="round-summary">
					<span className="counterSkip">Никто не угадал</span>
				</div>
			)}

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
