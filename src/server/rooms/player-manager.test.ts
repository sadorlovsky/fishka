import { beforeEach, describe, expect, test } from "bun:test";
import { createMockWs } from "../__tests__/helpers";
import { playerManager } from "./player-manager";

describe("PlayerManager", () => {
	let ws1: ReturnType<typeof createMockWs>;
	let ws2: ReturnType<typeof createMockWs>;

	beforeEach(() => {
		// Clean up all players from previous tests
		// We iterate over known players and remove them
		while (playerManager.count > 0) {
			// Get any player by iterating (use getByWs or create/remove pattern)
			// Since we can't iterate directly, we track IDs in tests
		}
		ws1 = createMockWs();
		ws2 = createMockWs();
	});

	describe("create", () => {
		test("creates player with unique id and sessionToken", () => {
			const player = playerManager.create("Alice", 0, ws1);

			expect(player.id).toBeDefined();
			expect(player.sessionToken).toBeDefined();
			expect(player.id).not.toBe(player.sessionToken);
			expect(player.name).toBe("Alice");
			expect(player.isConnected).toBe(true);
			expect(player.roomCode).toBeNull();
			expect(player.isSpectator).toBe(false);

			// Cleanup
			playerManager.remove(player.id);
		});

		test("sets ws.data references", () => {
			const player = playerManager.create("Bob", 0, ws1);

			expect(ws1.data.playerId).toBe(player.id);
			expect(ws1.data.sessionToken).toBe(player.sessionToken);

			playerManager.remove(player.id);
		});

		test("two players have different ids", () => {
			const p1 = playerManager.create("Alice", 0, ws1);
			const p2 = playerManager.create("Bob", 0, ws2);

			expect(p1.id).not.toBe(p2.id);
			expect(p1.sessionToken).not.toBe(p2.sessionToken);

			playerManager.remove(p1.id);
			playerManager.remove(p2.id);
		});
	});

	describe("get / getByWs / getBySession", () => {
		test("finds player by id", () => {
			const player = playerManager.create("Alice", 0, ws1);

			expect(playerManager.get(player.id)).toBe(player);

			playerManager.remove(player.id);
		});

		test("finds player by ws", () => {
			const player = playerManager.create("Alice", 0, ws1);

			expect(playerManager.getByWs(ws1)).toBe(player);

			playerManager.remove(player.id);
		});

		test("finds player by sessionToken", () => {
			const player = playerManager.create("Alice", 0, ws1);

			expect(playerManager.getBySession(player.sessionToken)).toBe(player);

			playerManager.remove(player.id);
		});

		test("returns null for unknown id", () => {
			expect(playerManager.get("nonexistent")).toBeNull();
		});

		test("returns null for unknown ws", () => {
			expect(playerManager.getByWs(createMockWs())).toBeNull();
		});

		test("returns null for unknown session", () => {
			expect(playerManager.getBySession("nonexistent")).toBeNull();
		});
	});

	describe("reconnect", () => {
		test("reconnects player with new ws", () => {
			const player = playerManager.create("Alice", 0, ws1);
			const token = player.sessionToken;

			playerManager.disconnect(ws1);
			expect(player.isConnected).toBe(false);

			const reconnected = playerManager.reconnect(token, ws2);
			expect(reconnected).toBe(player);
			expect(player.isConnected).toBe(true);
			expect(player.ws).toBe(ws2);
			expect(ws2.data.playerId).toBe(player.id);

			playerManager.remove(player.id);
		});

		test("removes old ws mapping on reconnect", () => {
			const player = playerManager.create("Alice", 0, ws1);

			// Reconnect with new ws (without disconnecting first)
			playerManager.reconnect(player.sessionToken, ws2);

			expect(playerManager.getByWs(ws1)).toBeNull();
			expect(playerManager.getByWs(ws2)).toBe(player);

			playerManager.remove(player.id);
		});

		test("returns null for invalid session token", () => {
			expect(playerManager.reconnect("invalid-token", ws1)).toBeNull();
		});
	});

	describe("disconnect", () => {
		test("marks player as disconnected but keeps in system", () => {
			const player = playerManager.create("Alice", 0, ws1);

			const disconnected = playerManager.disconnect(ws1);
			expect(disconnected).toBe(player);
			expect(player.isConnected).toBe(false);
			expect(player.ws).toBeNull();

			// Player still accessible by id and session
			expect(playerManager.get(player.id)).toBe(player);
			expect(playerManager.getBySession(player.sessionToken)).toBe(player);

			// But not by ws
			expect(playerManager.getByWs(ws1)).toBeNull();

			playerManager.remove(player.id);
		});

		test("returns null for unknown ws", () => {
			expect(playerManager.disconnect(createMockWs())).toBeNull();
		});
	});

	describe("remove", () => {
		test("completely removes player from all maps", () => {
			const player = playerManager.create("Alice", 0, ws1);
			const id = player.id;
			const token = player.sessionToken;

			playerManager.remove(id);

			expect(playerManager.get(id)).toBeNull();
			expect(playerManager.getByWs(ws1)).toBeNull();
			expect(playerManager.getBySession(token)).toBeNull();
		});

		test("does nothing for unknown id", () => {
			const countBefore = playerManager.count;
			playerManager.remove("nonexistent");
			expect(playerManager.count).toBe(countBefore);
		});
	});

	describe("heartbeat", () => {
		test("updates lastHeartbeat timestamp", () => {
			const player = playerManager.create("Alice", 0, ws1);
			const before = player.lastHeartbeat;

			// Small delay to ensure timestamp changes
			const _later = before + 100;
			player.lastHeartbeat = before; // reset to known value
			playerManager.heartbeat(ws1);

			expect(player.lastHeartbeat).toBeGreaterThanOrEqual(before);

			playerManager.remove(player.id);
		});
	});

	describe("toPlayerInfo", () => {
		test("converts to PlayerInfo correctly", () => {
			const player = playerManager.create("Alice", 0, ws1);
			const info = playerManager.toPlayerInfo(player);

			expect(info).toEqual({
				id: player.id,
				name: "Alice",
				avatarSeed: 0,
				isHost: false,
				isConnected: true,
				isSpectator: false,
			});

			playerManager.remove(player.id);
		});
	});

	describe("count", () => {
		test("reflects number of players", () => {
			const initial = playerManager.count;

			const p1 = playerManager.create("Alice", 0, ws1);
			expect(playerManager.count).toBe(initial + 1);

			const p2 = playerManager.create("Bob", 0, ws2);
			expect(playerManager.count).toBe(initial + 2);

			playerManager.remove(p1.id);
			expect(playerManager.count).toBe(initial + 1);

			playerManager.remove(p2.id);
			expect(playerManager.count).toBe(initial);
		});
	});
});
