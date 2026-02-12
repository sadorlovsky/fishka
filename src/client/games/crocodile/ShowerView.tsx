import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { Timer } from "../../components/Timer";
import { DrawingCanvas } from "./DrawingCanvas";

interface ShowerViewProps {
	state: CrocodilePlayerView;
	dispatch: (action: unknown) => void;
}

export function ShowerView({ state, dispatch }: ShowerViewProps) {
	const guessers = state.players.filter((p) => p.id !== state.currentShowerId);
	const isDrawing = state.mode === "drawing";

	return (
		<div className="game-role-view">
			<p className="role-label">{isDrawing ? "Вы рисуете" : "Вы показываете"}</p>

			<div className="word-card">
				<span className="word-text">{state.currentWord}</span>
			</div>

			{isDrawing ? <DrawingCanvas /> : <p className="hint-text">Покажите слово жестами!</p>}

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
