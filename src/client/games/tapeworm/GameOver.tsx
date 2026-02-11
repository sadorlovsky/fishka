import type { TapewormPlayerState } from "@/shared/types/tapeworm";
import { Avatar } from "../../components/Avatar";

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
					<Avatar seed={winner.avatarSeed} />
					<p className="tapeworm-gameover-winner-name">{winner.name}</p>
					<p className="tapeworm-gameover-winner-label">победил!</p>
				</div>
			)}

			<div className="tapeworm-gameover-standings">
				{sorted.map((p, i) => (
					<div
						key={p.id}
						className={`tapeworm-gameover-row${p.id === winnerId ? " tapeworm-gameover-row--winner" : ""}`}
					>
						<span className="tapeworm-gameover-rank">{i + 1}</span>
						<Avatar seed={p.avatarSeed} size="sm" />
						<span className="tapeworm-gameover-name">{p.name}</span>
						<span className="tapeworm-gameover-cards">
							{p.handSize === 0 ? "0 карт" : `${p.handSize} карт`}
						</span>
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
