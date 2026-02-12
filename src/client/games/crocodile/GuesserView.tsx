import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { PlayerChip } from "../../components/PlayerChip";
import { Timer } from "../../components/Timer";

interface GuesserViewProps {
	state: CrocodilePlayerView;
}

export function GuesserView({ state }: GuesserViewProps) {
	const shower = state.players.find((p) => p.id === state.currentShowerId);
	const guessers = state.players.filter((p) => p.id !== state.currentShowerId);
	const guessedCount = state.guessedPlayerIds.length;
	const totalGuessers = guessers.length;

	return (
		<div className="game-role-view">
			<p className="role-label">Вы угадываете</p>

			<div className="word-card word-card-hidden">
				<span className="word-text">?</span>
			</div>

			<p className="hint-text">{shower?.name ?? "Игрок"} показывает — угадывайте!</p>

			<Timer endsAt={state.timerEndsAt} />

			<div className="round-counters">
				<span className="counter-correct">
					Угадали: {guessedCount} / {totalGuessers}
				</span>
			</div>

			<div className="crocodile-guesser-list">
				{guessers.map((p) => {
					const guessed = state.guessedPlayerIds.includes(p.id);
					return (
						<PlayerChip key={p.id} avatarSeed={p.avatarSeed} name={p.name}>
							{guessed && <span className="crocodile-guesser-check">{"\u2713"}</span>}
						</PlayerChip>
					);
				})}
			</div>
		</div>
	);
}
