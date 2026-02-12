import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { Timer } from "../../components/Timer";

interface GuesserViewProps {
	state: CrocodilePlayerView;
}

export function GuesserView({ state }: GuesserViewProps) {
	const shower = state.players.find((p) => p.id === state.currentShowerId);

	return (
		<div className="game-role-view">
			<p className="role-label">Вы угадываете</p>

			<div className="word-card word-card-hidden">
				<span className="word-text">?</span>
			</div>

			<p className="hint-text">{shower?.name ?? "Игрок"} показывает — угадывайте!</p>

			<Timer endsAt={state.timerEndsAt} />
		</div>
	);
}
