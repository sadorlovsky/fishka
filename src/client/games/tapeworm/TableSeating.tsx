import type { ReactNode } from "react";
import type { TapewormPlayerState } from "@/shared/types/tapeworm";
import { PlayerChip } from "../../components/PlayerChip";

type Seat = "south" | "north" | "west" | "east";

interface TableSeatingProps {
	players: TapewormPlayerState[];
	turnOrder: string[];
	currentPlayerId: string;
	myPlayerId: string | null;
	hostId: string | null;
	children: ReactNode;
}

// Fixed seating: turnOrder[0]=south, [1]=west, [2]=north, [3]=east
const SEAT_ORDER: Seat[][] = [
	[],
	["south"],
	["south", "north"],
	["south", "west", "north"],
	["south", "west", "north", "east"],
];

function assignSeats(turnOrder: string[]): Record<string, Seat> {
	const seats: Record<string, Seat> = {};
	const order = SEAT_ORDER[turnOrder.length] ?? SEAT_ORDER[4]!;
	for (let i = 0; i < turnOrder.length; i++) {
		seats[turnOrder[i]!] = order[i]!;
	}
	return seats;
}

function SeatChip({
	player,
	seat,
	currentPlayerId,
	myPlayerId,
	hostId,
}: {
	player: TapewormPlayerState;
	seat: Seat;
	currentPlayerId: string;
	myPlayerId: string | null;
	hostId: string | null;
}) {
	const isSide = seat === "west" || seat === "east";
	const chip = (
		<PlayerChip
			avatarSeed={player.avatarSeed}
			name={player.name}
			isActive={player.id === currentPlayerId}
			isMe={player.id === myPlayerId}
			isHost={player.id === hostId}
			size="compact"
		>
			<span className="tapeworm-seat-cards">{player.handSize}</span>
		</PlayerChip>
	);

	if (isSide) {
		return (
			<div className={`tapeworm-seat tapeworm-seat--${seat}`}>
				<div className="tapeworm-seat-rotator">{chip}</div>
			</div>
		);
	}

	return <div className={`tapeworm-seat tapeworm-seat--${seat}`}>{chip}</div>;
}

export function TableSeating({
	players,
	turnOrder,
	currentPlayerId,
	myPlayerId,
	hostId,
	children,
}: TableSeatingProps) {
	const seats = assignSeats(turnOrder);

	const north = players.find((p) => seats[p.id] === "north");
	const south = players.find((p) => seats[p.id] === "south");
	const west = players.find((p) => seats[p.id] === "west");
	const east = players.find((p) => seats[p.id] === "east");

	return (
		<div className="tapeworm-table">
			{north && (
				<SeatChip
					player={north}
					seat="north"
					currentPlayerId={currentPlayerId}
					myPlayerId={myPlayerId}
					hostId={hostId}
				/>
			)}
			{west && (
				<SeatChip
					player={west}
					seat="west"
					currentPlayerId={currentPlayerId}
					myPlayerId={myPlayerId}
					hostId={hostId}
				/>
			)}
			<div className="tapeworm-table-board">{children}</div>
			{east && (
				<SeatChip
					player={east}
					seat="east"
					currentPlayerId={currentPlayerId}
					myPlayerId={myPlayerId}
					hostId={hostId}
				/>
			)}
			{south && (
				<SeatChip
					player={south}
					seat="south"
					currentPlayerId={currentPlayerId}
					myPlayerId={myPlayerId}
					hostId={hostId}
				/>
			)}
		</div>
	);
}
