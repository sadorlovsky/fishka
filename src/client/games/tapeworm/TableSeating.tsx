import type { ReactNode } from "react";
import type { TapewormPlayerState } from "@/shared/types/tapeworm";
import { PlayerChip } from "../../components/PlayerChip";

interface TableSeatingProps {
	players: TapewormPlayerState[];
	currentPlayerId: string;
	myPlayerId: string | null;
	hostId: string | null;
	children: ReactNode;
}

export function TableSeating({
	players,
	currentPlayerId,
	myPlayerId,
	hostId,
	children,
}: TableSeatingProps) {
	const me = players.find((p) => p.id === myPlayerId);
	const opponents = players.filter((p) => p.id !== myPlayerId);

	return (
		<div className="tapeworm-table">
			{opponents.length > 0 && (
				<div className="tapeworm-opponents">
					{opponents.map((p) => (
						<PlayerChip
							key={p.id}
							avatarSeed={p.avatarSeed}
							name={p.name}
							isActive={p.id === currentPlayerId}
							isHost={p.id === hostId}
						>
							<span className="tapeworm-seat-cards">{p.handSize}</span>
						</PlayerChip>
					))}
				</div>
			)}

			<div className="tapeworm-table-board">{children}</div>

			{me && (
				<div className="tapeworm-me">
					<PlayerChip
						avatarSeed={me.avatarSeed}
						name={me.name}
						isActive={me.id === currentPlayerId}
						isMe
						isHost={me.id === hostId}
					>
						<span className="tapeworm-seat-cards">{me.handSize}</span>
					</PlayerChip>
				</div>
			)}
		</div>
	);
}
