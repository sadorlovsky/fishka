import { RedisClient } from "bun";
import { REDIS_GAME_STATE_TTL, REDIS_ROOM_TTL, REDIS_SESSION_TTL } from "@/shared/constants";

const redis = new RedisClient();

// --- Sessions ---

export async function saveSession(
	token: string,
	data: { playerId: string; playerName: string; roomCode?: string },
): Promise<void> {
	await redis.set(`session:${token}`, JSON.stringify(data), "EX", REDIS_SESSION_TTL);
}

export async function getSession(
	token: string,
): Promise<{ playerId: string; playerName: string; roomCode?: string } | null> {
	const raw = await redis.get(`session:${token}`);
	if (!raw) {
		return null;
	}
	return JSON.parse(raw);
}

export async function deleteSession(token: string): Promise<void> {
	await redis.del(`session:${token}`);
}

export async function refreshSession(token: string): Promise<void> {
	await redis.expire(`session:${token}`, REDIS_SESSION_TTL);
}

// --- Game State ---

export async function saveGameState(roomCode: string, state: unknown): Promise<void> {
	await redis.set(`game:${roomCode}`, JSON.stringify(state), "EX", REDIS_GAME_STATE_TTL);
}

export async function getGameState(roomCode: string): Promise<unknown | null> {
	const raw = await redis.get(`game:${roomCode}`);
	if (!raw) {
		return null;
	}
	return JSON.parse(raw);
}

export async function deleteGameState(roomCode: string): Promise<void> {
	await redis.del(`game:${roomCode}`);
}

// --- Room snapshots (for reconnect) ---

export async function saveRoomSnapshot(roomCode: string, snapshot: unknown): Promise<void> {
	await redis.set(`room:${roomCode}`, JSON.stringify(snapshot), "EX", REDIS_ROOM_TTL);
}

export async function getRoomSnapshot(roomCode: string): Promise<unknown | null> {
	const raw = await redis.get(`room:${roomCode}`);
	if (!raw) {
		return null;
	}
	return JSON.parse(raw);
}

export async function deleteRoomSnapshot(roomCode: string): Promise<void> {
	await redis.del(`room:${roomCode}`);
}

export { redis };
