import type { ServerWebSocket } from "bun";
import { ErrorCode } from "@/shared/constants";
import type { ClientMessage } from "@/shared/types/protocol";
import { destroyEngine, getEngine, startGame } from "../games/engine";
import { playerManager } from "../rooms/player-manager";
import { roomManager } from "../rooms/room-manager";
import { parseMessage, send, sendError, type WSData } from "./connection";
import { connectRateLimiter, gameActionRateLimiter, joinRateLimiter } from "./rate-limit";

export function handleOpen(_ws: ServerWebSocket<WSData>): void {
	console.log("[ws] new connection");
}

export function handleMessage(ws: ServerWebSocket<WSData>, raw: string | Buffer): void {
	const msg = parseMessage(raw);
	if (!msg) {
		console.warn(`[security] invalid message from ip=${ws.remoteAddress}`);
		sendError(ws, ErrorCode.INVALID_MESSAGE, "Invalid message format");
		return;
	}

	try {
		switch (msg.type) {
			case "connect":
				handleConnect(ws, msg);
				break;
			case "heartbeat":
				playerManager.heartbeat(ws);
				break;
			case "createRoom":
				handleCreateRoom(ws, msg);
				break;
			case "joinRoom":
				handleJoinRoom(ws, msg);
				break;
			case "leaveRoom":
				handleLeaveRoom(ws);
				break;
			case "updateSettings":
				handleUpdateSettings(ws, msg);
				break;
			case "startGame":
				handleStartGame(ws);
				break;
			case "gameAction":
				handleGameAction(ws, msg);
				break;
			case "returnToLobby":
				handleReturnToLobby(ws);
				break;
			case "endGame":
				handleEndGame(ws);
				break;
			case "switchTeam":
				handleSwitchTeam(ws, msg);
				break;
			case "kickPlayer":
				handleKickPlayer(ws, msg);
				break;
			default:
				sendError(ws, ErrorCode.INVALID_MESSAGE, "Unknown message type");
		}
	} catch (error) {
		console.error("[ws] handler error:", error);
		sendError(ws, ErrorCode.INVALID_MESSAGE, "Internal error processing message");
	}
}

function handleConnect(
	ws: ServerWebSocket<WSData>,
	msg: Extract<ClientMessage, { type: "connect" }>,
): void {
	const ip = ws.remoteAddress;
	if (!connectRateLimiter.check(ip)) {
		sendError(ws, ErrorCode.RATE_LIMITED, "Too many connection attempts");
		return;
	}

	// Try reconnect with existing session
	if (msg.sessionToken) {
		const existing = playerManager.getBySession(msg.sessionToken);
		if (existing) {
			// Old WS hasn't closed yet (page refresh race) — force-disconnect it
			if (existing.isConnected && existing.ws) {
				const oldWs = existing.ws;
				playerManager.disconnect(oldWs);
				oldWs.close();
			}

			const player = playerManager.reconnect(msg.sessionToken, ws);
			if (player) {
				player.avatarSeed = msg.avatarSeed;

				// Check if the room still exists before telling client about it
				if (player.roomCode && !roomManager.get(player.roomCode)) {
					player.roomCode = null;
				}

				send(ws, {
					type: "connected",
					playerId: player.id,
					sessionToken: player.sessionToken,
					roomCode: player.roomCode ?? undefined,
				});

				// If player was in a room, rejoin and send full state
				if (player.roomCode) {
					const room = roomManager.get(player.roomCode)!;
					ws.subscribe(`room:${room.code}`);

					roomManager.sendToRoom(room.code, {
						type: "playerReconnected",
						playerId: player.id,
					});

					send(ws, {
						type: "roomState",
						room: roomManager.toRoomState(room),
					});

					if (room.status === "playing") {
						const engine = getEngine(room.code);
						if (engine) {
							engine.resume(player.id);

							const plugin = engine.getPlugin();
							const state = engine.getState();
							if (state) {
								const view = plugin.getPlayerView(state, player.id);
								send(ws, { type: "gameState", gameState: view });
							}
						}
					}
				}

				console.log(`[ws] player reconnected: ${player.name} (${player.id})`);
				return;
			}
		}
	}

	// New connection
	const player = playerManager.create(msg.playerName, msg.avatarSeed, ws);

	send(ws, {
		type: "connected",
		playerId: player.id,
		sessionToken: player.sessionToken,
	});

	console.log(`[ws] player connected: ${player.name} (${player.id})`);
}

function handleCreateRoom(
	ws: ServerWebSocket<WSData>,
	msg: Extract<ClientMessage, { type: "createRoom" }>,
): void {
	const player = playerManager.getByWs(ws);
	if (!player) {
		return;
	}

	// Leave current room if in one
	if (player.roomCode) {
		handleLeaveRoom(ws);
	}

	const room = roomManager.create(player.id, msg.settings);

	send(ws, {
		type: "roomCreated",
		room: roomManager.toRoomState(room),
	});

	console.log(`[ws] room created: ${room.code} by ${player.name}`);
}

function handleJoinRoom(
	ws: ServerWebSocket<WSData>,
	msg: Extract<ClientMessage, { type: "joinRoom" }>,
): void {
	const ip = ws.remoteAddress;
	if (!joinRateLimiter.check(ip)) {
		sendError(ws, ErrorCode.RATE_LIMITED, "Too many join attempts");
		return;
	}

	const player = playerManager.getByWs(ws);
	if (!player) {
		return;
	}

	// Leave current room if in one
	if (player.roomCode) {
		handleLeaveRoom(ws);
	}

	const code = msg.roomCode.toUpperCase();
	const result = roomManager.join(code, player.id);

	if (result.error || !result.room) {
		console.warn(
			`[security] failed join: code=${code} error=${result.error} ip=${ws.remoteAddress}`,
		);
		sendError(ws, result.error ?? "UNKNOWN", `Cannot join room`);
		return;
	}

	const room = result.room;

	// Send full room state to joining player FIRST
	send(ws, {
		type: "roomJoined",
		room: roomManager.toRoomState(room),
	});

	// Notify OTHER players about the new player
	for (const pid of room.playerIds) {
		if (pid === player.id) {
			continue;
		}
		roomManager.sendToPlayer(pid, {
			type: "playerJoined",
			player: {
				...playerManager.toPlayerInfo(player),
				isHost: false,
			},
		});
	}

	console.log(`[ws] ${player.name} joined room ${room.code}`);
}

function handleLeaveRoom(ws: ServerWebSocket<WSData>): void {
	const player = playerManager.getByWs(ws);
	if (!player?.roomCode) {
		return;
	}

	const roomCode = player.roomCode;

	// Notify the leaving player first
	send(ws, { type: "playerLeft", playerId: player.id });

	roomManager.leave(roomCode, player.id);

	// Notify remaining players
	const room = roomManager.get(roomCode);
	if (room) {
		roomManager.sendToRoom(roomCode, {
			type: "playerLeft",
			playerId: player.id,
		});

		// If host changed, send updated room state
		roomManager.sendToRoom(roomCode, {
			type: "roomState",
			room: roomManager.toRoomState(room),
		});
	}

	console.log(`[ws] ${player.name} left room ${roomCode}`);
}

function handleUpdateSettings(
	ws: ServerWebSocket<WSData>,
	msg: Extract<ClientMessage, { type: "updateSettings" }>,
): void {
	const player = playerManager.getByWs(ws);
	if (!player?.roomCode) {
		return;
	}

	const error = roomManager.updateSettings(player.roomCode, player.id, msg.settings);
	if (error) {
		sendError(ws, error, `Cannot update settings: ${error}`);
		return;
	}

	const room = roomManager.get(player.roomCode)!;
	roomManager.sendToRoom(player.roomCode, {
		type: "settingsUpdated",
		settings: room.settings,
	});
}

function handleStartGame(ws: ServerWebSocket<WSData>): void {
	const player = playerManager.getByWs(ws);
	if (!player?.roomCode) {
		return;
	}

	const error = roomManager.canStart(player.roomCode, player.id);
	if (error) {
		sendError(ws, error, `Cannot start game: ${error}`);
		return;
	}

	const room = roomManager.get(player.roomCode)!;
	const players = room.playerIds
		.map((id) => playerManager.get(id))
		.filter(Boolean)
		.map((p) => playerManager.toPlayerInfo(p!));

	const result = startGame(room.code, room.settings.gameId, players, room.settings.gameConfig);

	if (result.error) {
		sendError(ws, ErrorCode.GAME_NOT_FOUND, result.error);
		return;
	}

	console.log(`[ws] game started in room ${room.code}`);
}

function handleGameAction(
	ws: ServerWebSocket<WSData>,
	msg: Extract<ClientMessage, { type: "gameAction" }>,
): void {
	const player = playerManager.getByWs(ws);
	if (!player?.roomCode) {
		return;
	}

	if (!gameActionRateLimiter.check(player.id)) {
		sendError(ws, ErrorCode.RATE_LIMITED, "Too many actions");
		return;
	}

	const engine = getEngine(player.roomCode);
	if (!engine) {
		sendError(ws, ErrorCode.GAME_NOT_STARTED, "No active game");
		return;
	}

	const result = engine.handleAction(player.id, msg.action);

	send(ws, {
		type: "gameActionResult",
		success: result.success,
		error: result.error,
	});
}

function handleSwitchTeam(
	ws: ServerWebSocket<WSData>,
	msg: Extract<ClientMessage, { type: "switchTeam" }>,
): void {
	const player = playerManager.getByWs(ws);
	if (!player?.roomCode) {
		return;
	}

	const room = roomManager.get(player.roomCode);
	if (!room) {
		return;
	}

	if (room.status !== "lobby") {
		sendError(ws, ErrorCode.ROOM_IN_PROGRESS, "Game is in progress");
		return;
	}

	const gameConfig = room.settings.gameConfig as Record<string, unknown>;
	const teams = gameConfig.teams as Record<string, string[]> | undefined;
	if (!teams || !teams[msg.teamId]) {
		sendError(ws, ErrorCode.INVALID_ACTION, "Invalid team");
		return;
	}

	// Already in this team
	if (teams[msg.teamId]!.includes(player.id)) {
		return;
	}

	// Remove from all teams, add to target
	const updated: Record<string, string[]> = {};
	for (const [tid, members] of Object.entries(teams)) {
		updated[tid] = members.filter((id) => id !== player.id);
	}
	updated[msg.teamId] = [...updated[msg.teamId]!, player.id];

	const newSettings = {
		...room.settings,
		gameConfig: { ...gameConfig, teams: updated },
	};
	room.settings = newSettings;

	roomManager.sendToRoom(room.code, {
		type: "settingsUpdated",
		settings: newSettings,
	});
}

function handleKickPlayer(
	ws: ServerWebSocket<WSData>,
	msg: Extract<ClientMessage, { type: "kickPlayer" }>,
): void {
	const player = playerManager.getByWs(ws);
	if (!player?.roomCode) {
		return;
	}

	const room = roomManager.get(player.roomCode);
	if (!room) {
		return;
	}

	if (room.hostId !== player.id) {
		sendError(ws, ErrorCode.NOT_HOST, "Only host can kick players");
		return;
	}

	if (msg.targetPlayerId === player.id) {
		sendError(ws, ErrorCode.INVALID_ACTION, "Cannot kick yourself");
		return;
	}

	if (!room.playerIds.includes(msg.targetPlayerId)) {
		sendError(ws, ErrorCode.INVALID_ACTION, "Player not in room");
		return;
	}

	const targetPlayer = playerManager.get(msg.targetPlayerId);

	// Ban + remove from room
	roomManager.ban(room.code, msg.targetPlayerId);
	roomManager.leave(room.code, msg.targetPlayerId);

	// Notify kicked player
	if (targetPlayer) {
		roomManager.sendToPlayer(msg.targetPlayerId, {
			type: "playerKicked",
			playerId: msg.targetPlayerId,
		});
	}

	// Notify remaining players
	const updatedRoom = roomManager.get(room.code);
	if (updatedRoom) {
		roomManager.sendToRoom(room.code, {
			type: "playerLeft",
			playerId: msg.targetPlayerId,
		});
		roomManager.sendToRoom(room.code, {
			type: "roomState",
			room: roomManager.toRoomState(updatedRoom),
		});
	}

	console.log(
		`[ws] ${player.name} kicked ${targetPlayer?.name ?? msg.targetPlayerId} from room ${room.code}`,
	);
}

function handleEndGame(ws: ServerWebSocket<WSData>): void {
	const player = playerManager.getByWs(ws);
	if (!player?.roomCode) {
		return;
	}

	const room = roomManager.get(player.roomCode);
	if (!room) {
		return;
	}

	if (room.hostId !== player.id) {
		sendError(ws, ErrorCode.NOT_HOST, "Only host can end the game");
		return;
	}

	if (room.status !== "playing") {
		sendError(ws, ErrorCode.INVALID_ACTION, "Game is not in progress");
		return;
	}

	destroyEngine(room.code);
	roomManager.setStatus(room.code, "lobby");
	roomManager.setGameState(room.code, null);

	const updatedRoom = roomManager.get(room.code)!;
	roomManager.sendToRoom(room.code, {
		type: "returnedToLobby",
		room: roomManager.toRoomState(updatedRoom),
	});

	console.log(`[ws] host ended game in room ${room.code}`);
}

function handleReturnToLobby(ws: ServerWebSocket<WSData>): void {
	const player = playerManager.getByWs(ws);
	if (!player?.roomCode) {
		return;
	}

	const room = roomManager.get(player.roomCode);
	if (!room) {
		return;
	}

	if (room.hostId !== player.id) {
		sendError(ws, ErrorCode.NOT_HOST, "Only host can return to lobby");
		return;
	}

	if (room.status !== "finished") {
		sendError(ws, "NOT_FINISHED", "Game is not finished");
		return;
	}

	destroyEngine(room.code);
	roomManager.setStatus(room.code, "lobby");
	roomManager.setGameState(room.code, null);

	const updatedRoom = roomManager.get(room.code)!;
	roomManager.sendToRoom(room.code, {
		type: "returnedToLobby",
		room: roomManager.toRoomState(updatedRoom),
	});

	console.log(`[ws] room ${room.code} returned to lobby`);
}

export function handleClose(ws: ServerWebSocket<WSData>, code: number, _reason: string): void {
	const player = playerManager.disconnect(ws);
	if (!player) {
		return;
	}

	// Notify room about disconnection (not removal — player can reconnect)
	if (player.roomCode) {
		roomManager.sendToRoom(player.roomCode, {
			type: "playerDisconnected",
			playerId: player.id,
		});

		// Pause game if in progress
		const room = roomManager.get(player.roomCode);
		if (room?.status === "playing") {
			const engine = getEngine(player.roomCode);
			if (engine) {
				engine.pause(player.id);
			}
		}
	}

	console.log(`[ws] player disconnected: ${player.name} (${code})`);
}
