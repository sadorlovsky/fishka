// Room
export const ROOM_CODE_LENGTH = 4;
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
export const MAX_PLAYERS_PER_ROOM = 12;
export const MIN_PLAYERS_TO_START = 2;

// Timers (ms)
export const HEARTBEAT_INTERVAL = 5_000;
export const HEARTBEAT_TIMEOUT = 15_000;
export const RECONNECT_WINDOW = 5 * 60_000; // 5 min
export const ROOM_IDLE_TIMEOUT = 30 * 60_000; // 30 min

// Player cleanup
export const ORPHAN_PLAYER_TIMEOUT = 5 * 60_000; // 5 min — remove disconnected players without a room

// Game pause on disconnect
export const PAUSE_TIMEOUT_MS = 60_000; // 60s to reconnect before game ends

// Game transitions
export const ROUND_START_COUNTDOWN_MS = 3_000; // 3s pre-round countdown
export const ROUND_END_DELAY_MS = 10_000; // 10s round-end auto-advance

// WebSocket reconnect (client)
export const WS_RECONNECT_BASE_DELAY = 500;
export const WS_RECONNECT_MAX_DELAY = 10_000;

// Error codes
export const ErrorCode = {
	ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
	ROOM_FULL: "ROOM_FULL",
	ROOM_IN_PROGRESS: "ROOM_IN_PROGRESS",
	NOT_HOST: "NOT_HOST",
	NOT_ENOUGH_PLAYERS: "NOT_ENOUGH_PLAYERS",
	INVALID_ACTION: "INVALID_ACTION",
	NOT_YOUR_TURN: "NOT_YOUR_TURN",
	GAME_NOT_STARTED: "GAME_NOT_STARTED",
	GAME_NOT_FOUND: "GAME_NOT_FOUND",
	PLAYER_BANNED: "PLAYER_BANNED",
	PLAYER_NAME_TAKEN: "PLAYER_NAME_TAKEN",
	INVALID_MESSAGE: "INVALID_MESSAGE",
	SESSION_EXPIRED: "SESSION_EXPIRED",
	JOIN_FAILED: "JOIN_FAILED",
	RATE_LIMITED: "RATE_LIMITED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
