import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { Avatar } from "../../components/Avatar";
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
						<div
							key={p.id}
							className={`crocodile-guesser-item${guessed ? " crocodile-guesser-item--guessed" : ""}`}
						>
							<Avatar seed={p.avatarSeed} size="sm" />
							<span className="crocodile-guesser-name">{p.name}</span>
							{guessed && <span className="crocodile-guesser-check">{"\u2713"}</span>}
						</div>
					);
				})}
			</div>
		</div>
	);
}
