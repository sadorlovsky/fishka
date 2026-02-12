import type { TapewormPlayerState } from "@/shared/types/tapeworm";
import { PlayerChip } from "../../components/PlayerChip";

interface GameOverProps {
	players: TapewormPlayerState[];
	winnerId: string | null;
	isHost: boolean;
	onReturnToLobby: () => void;
}

export function GameOver({ players, winnerId, isHost, onReturnToLobby }: GameOverProps) {
	const winner = players.find((p) => p.id === winnerId);
	const sorted = [...players].sort((a, b) => a.handSize - b.handSize);

	return (
		<div className="tapeworm-gameover">
			{winner && (
				<div className="tapeworm-gameover-winner">
					<PlayerChip avatarSeed={winner.avatarSeed} name={winner.name} subtitle="победил!" />
				</div>
			)}

			<div className="tapeworm-gameover-standings">
				{sorted.map((p, i) => (
					<div key={p.id} className="tapeworm-gameover-row">
						<span className="tapeworm-gameover-rank">{i + 1}</span>
						<PlayerChip avatarSeed={p.avatarSeed} name={p.name} isCurrent={p.id === winnerId}>
							<span className="tapeworm-gameover-cards">
								{p.handSize === 0 ? "0 карт" : `${p.handSize} карт`}
							</span>
						</PlayerChip>
					</div>
				))}
			</div>

			{isHost && (
				<button className="btn btn-primary" onClick={onReturnToLobby}>
					В лобби
				</button>
			)}
		</div>
	);
}
