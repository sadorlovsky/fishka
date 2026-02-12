import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { Timer } from "../../components/Timer";

interface ShowerViewProps {
	state: CrocodilePlayerView;
	dispatch: (action: unknown) => void;
}

export function ShowerView({ state, dispatch }: ShowerViewProps) {
	const guessers = state.players.filter((p) => p.id !== state.currentShowerId);

	return (
		<div className="game-role-view">
			<p className="role-label">Вы показываете</p>

			<div className="word-card">
				<span className="word-text">{state.currentWord}</span>
			</div>

			<p className="hint-text">Покажите слово жестами!</p>

			<Timer endsAt={state.timerEndsAt} />

			<div className="crocodile-guesser-list">
				<p className="hint-text">Кто угадал?</p>
				{guessers.map((p) => (
					<button
						key={p.id}
						className="btn btn-primary crocodile-guesser-btn"
						onClick={() => dispatch({ type: "markCorrect", guesserId: p.id })}
					>
						{p.name}
					</button>
				))}
			</div>
		</div>
	);
}
