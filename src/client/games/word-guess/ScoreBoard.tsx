import type { WordGuessPlayerView } from "@/shared/types/word-guess";
import { PlayerChip } from "../../components/PlayerChip";
import "./ScoreBoard.css";

interface ScoreBoardProps {
	state: WordGuessPlayerView;
	currentPlayerId: string | null;
}

export function ScoreBoard({ state, currentPlayerId }: ScoreBoardProps) {
	if (state.mode === "teams" && state.teams && state.teamScores) {
		return <TeamsScoreBoard state={state} currentPlayerId={currentPlayerId} />;
	}

	return <FFAScoreBoard state={state} currentPlayerId={currentPlayerId} />;
}

function FFAScoreBoard({ state, currentPlayerId }: ScoreBoardProps) {
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
						isMe={player.id === currentPlayerId}
						isCurrent={player.id === currentPlayerId}
						subtitle={player.id === state.currentExplainerId ? "объясняет" : undefined}
					>
						<span className="scoreboard-score">{player.score}</span>
					</PlayerChip>
				))}
			</div>
		</div>
	);
}

function TeamsScoreBoard({ state, currentPlayerId }: ScoreBoardProps) {
	const teamIds = state.teams ? Object.keys(state.teams) : [];

	return (
		<div className="scoreboard">
			<div className="scoreboard-round">
				Раунд {state.currentRound} / {state.totalRounds}
			</div>
			<div className="scoreboard-teams">
				{teamIds.map((teamId, index) => {
					const members = state.teams![teamId]!;
					const teamScore = state.teamScores?.[teamId] ?? 0;
					const teamPlayers = state.players.filter((p) => members.includes(p.id));

					return (
						<div key={teamId} className="scoreboard-team">
							<div className="scoreboard-team-header">
								<span className="scoreboard-team-name">Команда {index + 1}</span>
								<span className="scoreboard-score">{teamScore}</span>
							</div>
							{teamPlayers.map((player) => (
								<PlayerChip
									key={player.id}
									avatarSeed={player.avatarSeed}
									name={player.name}
									isMe={player.id === currentPlayerId}
									isCurrent={player.id === currentPlayerId}
									subtitle={player.id === state.currentExplainerId ? "объясняет" : undefined}
								>
									<span className="scoreboard-score">{player.score}</span>
								</PlayerChip>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
