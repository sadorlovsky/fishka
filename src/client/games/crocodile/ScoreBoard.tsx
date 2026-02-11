import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { PlayerChip } from "../../components/PlayerChip";

interface ScoreBoardProps {
	state: CrocodilePlayerView;
	currentPlayerId: string | null;
}

export function ScoreBoard({ state, currentPlayerId }: ScoreBoardProps) {
	const sorted = [...state.players].sort((a, b) => b.score - a.score);

	return (
		<div className="scoreboard">
			<div className="scoreboard-round">
				Раунд {state.currentRound} / {state.totalRounds}
			</div>
			<div className="scoreboard-players-list">
				{sorted.map((player) => (
					<PlayerChip
						key={player.id}
						avatarSeed={player.avatarSeed}
						name={player.name}
						isCurrent={player.id === currentPlayerId}
						subtitle={player.id === state.currentShowerId ? "показывает" : undefined}
					>
						<span className="scoreboard-score">{player.score}</span>
					</PlayerChip>
				))}
			</div>
		</div>
	);
}
