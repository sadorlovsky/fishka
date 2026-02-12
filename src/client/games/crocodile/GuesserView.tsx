import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { Timer } from "../../components/Timer";
import { DrawingCanvas } from "./DrawingCanvas";

interface GuesserViewProps {
	state: CrocodilePlayerView;
}

export function GuesserView({ state }: GuesserViewProps) {
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
		</div>
	);
}
