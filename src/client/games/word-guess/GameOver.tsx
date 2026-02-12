import type { WordGuessPlayerView } from "@/shared/types/word-guess";
import { PlayerChip } from "../../components/PlayerChip";
import "./GameOver.css";

interface GameOverProps {
	state: WordGuessPlayerView;
	currentPlayerId: string | null;
	isHost: boolean;
	onReturnToLobby: () => void;
}

export function GameOver({ state, currentPlayerId, isHost, onReturnToLobby }: GameOverProps) {
	const content =
		state.mode === "teams" && state.teams && state.teamScores ? (
			<TeamsGameOver state={state} currentPlayerId={currentPlayerId} />
		) : (
			<FFAGameOver state={state} currentPlayerId={currentPlayerId} />
		);

	return (
		<>
			{content}
			{isHost ? (
				<button className="btn" onClick={onReturnToLobby}>
					В лобби
				</button>
			) : (
				<p className="status-text">Ожидание хоста...</p>
			)}
		</>
	);
}

interface SubProps {
	state: WordGuessPlayerView;
	currentPlayerId: string | null;
}

function FFAGameOver({ state, currentPlayerId }: SubProps) {
	const sorted = [...state.players].sort((a, b) => b.score - a.score);
	const winner = sorted[0];
	const isWinner = winner?.id === currentPlayerId;

	return (
		<div className="game-over">
			<h2>Игра окончена!</h2>

			{winner && (
				<div className="winner-announce">
					<p className="winner-label">{isWinner ? "Вы победили!" : `${winner.name} побеждает!`}</p>
					<p className="winner-score">{winner.score} очков</p>
				</div>
			)}

			<div className="final-standings">
				{sorted.map((player, i) => (
					<div key={player.id} className="final-row">
						<span className="final-rank">{i + 1}</span>
						<PlayerChip
							avatarSeed={player.avatarSeed}
							name={player.name}
							isCurrent={player.id === currentPlayerId}
						>
							<span className="score">{player.score}</span>
						</PlayerChip>
					</div>
				))}
			</div>
		</div>
	);
}

function TeamsGameOver({ state, currentPlayerId }: SubProps) {
	const teamIds = state.teams ? Object.keys(state.teams) : [];
	const sortedTeams = [...teamIds].sort(
		(a, b) => (state.teamScores?.[b] ?? 0) - (state.teamScores?.[a] ?? 0),
	);
	const winnerTeamId = sortedTeams[0];
	const myTeamId = state.players.find((p) => p.id === currentPlayerId)?.teamId;
	const isWinnerTeam = myTeamId === winnerTeamId;

	return (
		<div className="game-over">
			<h2>Игра окончена!</h2>

			{winnerTeamId && (
				<div className="winner-announce">
					<p className="winner-label">
						{isWinnerTeam
							? "Ваша команда победила!"
							: `Команда ${teamIds.indexOf(winnerTeamId) + 1} побеждает!`}
					</p>
					<p className="winner-score">{state.teamScores?.[winnerTeamId] ?? 0} очков</p>
				</div>
			)}

			<div className="final-standings">
				{sortedTeams.map((teamId, _teamIndex) => {
					const members = state.teams![teamId]!;
					const teamPlayers = state.players
						.filter((p) => members.includes(p.id))
						.sort((a, b) => b.score - a.score);

					return (
						<div key={teamId} className="final-team">
							<div className="teamHeader">
								<span className="teamName">Команда {teamIds.indexOf(teamId) + 1}</span>
								<span className="score">{state.teamScores?.[teamId] ?? 0}</span>
							</div>
							{teamPlayers.map((player) => (
								<PlayerChip
									key={player.id}
									avatarSeed={player.avatarSeed}
									name={player.name}
									isCurrent={player.id === currentPlayerId}
								>
									<span className="score">{player.score}</span>
								</PlayerChip>
							))}
						</div>
					);
				})}
			</div>
		</div>
	);
}
