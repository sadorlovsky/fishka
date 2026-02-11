export type RoomStatus = "lobby" | "playing" | "finished";

export interface PlayerInfo {
	id: string;
	name: string;
	avatarSeed: number;
	isHost: boolean;
	isConnected: boolean;
	isSpectator: boolean;
}

export interface RoomSettings {
	gameId: string;
	maxPlayers: number;
	isPrivate: boolean;
	gameConfig: Record<string, unknown>;
}

export interface RoomState {
	code: string;
	status: RoomStatus;
	hostId: string;
	players: PlayerInfo[];
	settings: RoomSettings;
	createdAt: number;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
	gameId: "word-guess",
	maxPlayers: 8,
	isPrivate: false,
	gameConfig: {},
};
