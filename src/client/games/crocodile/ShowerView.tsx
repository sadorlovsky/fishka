import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { PlayerChip } from "../../components/PlayerChip";
import { Timer } from "../../components/Timer";

interface ShowerViewProps {
	state: CrocodilePlayerView;
	dispatch: (action: unknown) => void;
}

export function ShowerView({ state, dispatch }: ShowerViewProps) {
	const guessers = state.players.filter((p) => p.id !== state.currentShowerId);
	const guessedCount = state.guessedPlayerIds.length;
	const totalGuessers = guessers.length;

	return (
		<div className="game-role-view">
			<p className="role-label">Вы показываете</p>

			<div className="word-card">
				<span className="word-text">{state.currentWord}</span>
			</div>

			<p className="hint-text">Покажите слово жестами!</p>

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
							{guessed ? (
								<span className="crocodile-guesser-check">{"\u2713"}</span>
							) : (
								<button
									className="btn btn-primary crocodile-guesser-btn"
									onClick={() => dispatch({ type: "markCorrect", guesserId: p.id })}
								>
									Угадал!
								</button>
							)}
						</PlayerChip>
					);
				})}
			</div>

			<button className="btn btn-secondary" onClick={() => dispatch({ type: "skip" })}>
				Пропустить
			</button>
		</div>
	);
}
