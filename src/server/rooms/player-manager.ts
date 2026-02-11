import type { ServerWebSocket } from "bun";
import { HEARTBEAT_TIMEOUT, ORPHAN_PLAYER_TIMEOUT } from "@/shared/constants";
import type { PlayerInfo } from "@/shared/types/room";
import type { WSData } from "../ws/connection";

export interface ServerPlayer {
	id: string;
	name: string;
	avatarSeed: number;
	sessionToken: string;
	ws: ServerWebSocket<WSData> | null;
	roomCode: string | null;
	isConnected: boolean;
	isSpectator: boolean;
	connectedAt: number;
	lastHeartbeat: number;
}

class PlayerManager {
	private players = new Map<string, ServerPlayer>();
	private sessionToPlayer = new Map<string, string>();
	private wsToPlayer = new Map<ServerWebSocket<WSData>, string>();

	create(name: string, avatarSeed: number, ws: ServerWebSocket<WSData>): ServerPlayer {
		const id = crypto.randomUUID();
		const sessionToken = crypto.randomUUID();
		const now = Date.now();

		const player: ServerPlayer = {
			id,
			name,
			avatarSeed,
			sessionToken,
			ws,
			roomCode: null,
			isConnected: true,
			isSpectator: false,
			connectedAt: now,
			lastHeartbeat: now,
		};

		this.players.set(id, player);
		this.sessionToPlayer.set(sessionToken, id);
		this.wsToPlayer.set(ws, id);

		ws.data.playerId = id;
		ws.data.sessionToken = sessionToken;

		return player;
	}

	reconnect(sessionToken: string, ws: ServerWebSocket<WSData>): ServerPlayer | null {
		const playerId = this.sessionToPlayer.get(sessionToken);
		if (!playerId) {
			return null;
		}

		const player = this.players.get(playerId);
		if (!player) {
			return null;
		}

		// Remove old ws mapping if exists
		if (player.ws) {
			this.wsToPlayer.delete(player.ws);
		}

		player.ws = ws;
		player.isConnected = true;
		player.lastHeartbeat = Date.now();

		this.wsToPlayer.set(ws, playerId);

		ws.data.playerId = playerId;
		ws.data.sessionToken = sessionToken;

		return player;
	}

	disconnect(ws: ServerWebSocket<WSData>): ServerPlayer | null {
		const playerId = this.wsToPlayer.get(ws);
		if (!playerId) {
			return null;
		}

		const player = this.players.get(playerId);
		if (!player) {
			return null;
		}

		player.isConnected = false;
		player.ws = null;
		this.wsToPlayer.delete(ws);

		return player;
	}

	remove(playerId: string): void {
		const player = this.players.get(playerId);
		if (!player) {
			return;
		}

		if (player.ws) {
			this.wsToPlayer.delete(player.ws);
		}
		this.sessionToPlayer.delete(player.sessionToken);
		this.players.delete(playerId);
	}

	get(playerId: string): ServerPlayer | null {
		return this.players.get(playerId) ?? null;
	}

	getByWs(ws: ServerWebSocket<WSData>): ServerPlayer | null {
		const playerId = this.wsToPlayer.get(ws);
		if (!playerId) {
			return null;
		}
		return this.players.get(playerId) ?? null;
	}

	getBySession(sessionToken: string): ServerPlayer | null {
		const playerId = this.sessionToPlayer.get(sessionToken);
		if (!playerId) {
			return null;
		}
		return this.players.get(playerId) ?? null;
	}

	heartbeat(ws: ServerWebSocket<WSData>): void {
		const player = this.getByWs(ws);
		if (player) {
			player.lastHeartbeat = Date.now();
		}
	}

	toPlayerInfo(player: ServerPlayer): PlayerInfo {
		return {
			id: player.id,
			name: player.name,
			avatarSeed: player.avatarSeed,
			isHost: false, // set by RoomManager
			isConnected: player.isConnected,
			isSpectator: player.isSpectator,
		};
	}

	sweepStaleConnections(): number {
		const now = Date.now();
		let closed = 0;

		for (const player of this.players.values()) {
			if (player.isConnected && player.ws && now - player.lastHeartbeat > HEARTBEAT_TIMEOUT) {
				player.ws.close();
				closed++;
			}
		}

		return closed;
	}

	sweepOrphanPlayers(): number {
		const now = Date.now();
		let removed = 0;
		const toRemove: string[] = [];

		for (const player of this.players.values()) {
			if (
				!player.isConnected &&
				!player.roomCode &&
				now - player.lastHeartbeat > ORPHAN_PLAYER_TIMEOUT
			) {
				toRemove.push(player.id);
			}
		}

		for (const id of toRemove) {
			this.remove(id);
			removed++;
		}

		return removed;
	}

	startSweep(intervalMs = 15_000): void {
		setInterval(() => {
			const closed = this.sweepStaleConnections();
			const removed = this.sweepOrphanPlayers();
			if (closed > 0 || removed > 0) {
				console.log(
					`[sweep] closed ${closed} stale, removed ${removed} orphan players, ${this.players.size} remaining`,
				);
			}
		}, intervalMs);
	}

	get count(): number {
		return this.players.size;
	}
}

export const playerManager = new PlayerManager();
