import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { TextGuessInput } from "../../components/TextGuessInput";
import { Timer } from "../../components/Timer";
import { DrawingCanvas } from "./DrawingCanvas";

interface GuesserViewProps {
	state: CrocodilePlayerView;
	dispatch?: (action: unknown) => void;
}

export function GuesserView({ state, dispatch }: GuesserViewProps) {
	const shower = state.players.find((p) => p.id === state.currentShowerId);
	const isDrawing = state.mode === "drawing";

	return (
		<div className="game-role-view">
			<p className="role-label">Вы угадываете</p>

			{!isDrawing && (
				<div className="word-card word-card-hidden">
					<span className="word-text">?</span>
				</div>
			)}

			<p className="hint-text">
				{shower?.name ?? "Игрок"} {isDrawing ? "рисует" : "показывает"} — угадывайте!
			</p>

			{isDrawing && <DrawingCanvas readonly />}

			<Timer endsAt={state.timerEndsAt} />

			{state.textMode && dispatch && (
				<TextGuessInput dispatch={dispatch} placeholder="Угадайте слово..." />
			)}
		</div>
	);
}
