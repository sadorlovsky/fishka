import { describe, expect, test } from "bun:test";
import { decodeClientMessage } from "./schemas";

describe("decodeClientMessage", () => {
	describe("connect", () => {
		test("valid connect message", () => {
			const result = decodeClientMessage({
				type: "connect",
				playerName: "Alice",
				avatarSeed: 42,
			});
			expect(result).toEqual({
				type: "connect",
				playerName: "Alice",
				avatarSeed: 42,
			});
		});

		test("connect with sessionToken", () => {
			const result = decodeClientMessage({
				type: "connect",
				playerName: "Alice",
				avatarSeed: 0,
				sessionToken: "abc-123",
			});
			expect(result).toEqual({
				type: "connect",
				playerName: "Alice",
				avatarSeed: 0,
				sessionToken: "abc-123",
			});
		});

		test("rejects empty playerName", () => {
			expect(
				decodeClientMessage({
					type: "connect",
					playerName: "",
					avatarSeed: 0,
				}),
			).toBeNull();
		});

		test("rejects playerName longer than 20 chars", () => {
			expect(
				decodeClientMessage({
					type: "connect",
					playerName: "A".repeat(21),
					avatarSeed: 0,
				}),
			).toBeNull();
		});

		test("rejects negative avatarSeed", () => {
			expect(
				decodeClientMessage({
					type: "connect",
					playerName: "Alice",
					avatarSeed: -1,
				}),
			).toBeNull();
		});

		test("rejects float avatarSeed", () => {
			expect(
				decodeClientMessage({
					type: "connect",
					playerName: "Alice",
					avatarSeed: 1.5,
				}),
			).toBeNull();
		});

		test("rejects missing playerName", () => {
			expect(
				decodeClientMessage({
					type: "connect",
					avatarSeed: 0,
				}),
			).toBeNull();
		});

		test("rejects missing avatarSeed", () => {
			expect(
				decodeClientMessage({
					type: "connect",
					playerName: "Alice",
				}),
			).toBeNull();
		});
	});

	describe("heartbeat", () => {
		test("valid heartbeat", () => {
			expect(decodeClientMessage({ type: "heartbeat" })).toEqual({
				type: "heartbeat",
			});
		});
	});

	describe("joinRoom", () => {
		test("valid joinRoom", () => {
			expect(decodeClientMessage({ type: "joinRoom", roomCode: "ABCD" })).toEqual({
				type: "joinRoom",
				roomCode: "ABCD",
			});
		});

		test("rejects empty roomCode", () => {
			expect(decodeClientMessage({ type: "joinRoom", roomCode: "" })).toBeNull();
		});

		test("rejects missing roomCode", () => {
			expect(decodeClientMessage({ type: "joinRoom" })).toBeNull();
		});

		test("rejects roomCode longer than 10 chars", () => {
			expect(decodeClientMessage({ type: "joinRoom", roomCode: "A".repeat(11) })).toBeNull();
		});
	});

	describe("createRoom", () => {
		test("valid createRoom without settings", () => {
			expect(decodeClientMessage({ type: "createRoom" })).toEqual({
				type: "createRoom",
			});
		});

		test("valid createRoom with settings", () => {
			const result = decodeClientMessage({
				type: "createRoom",
				settings: { gameId: "word-guess", maxPlayers: 4 },
			});
			expect(result).toEqual({
				type: "createRoom",
				settings: { gameId: "word-guess", maxPlayers: 4 },
			});
		});

		test("rejects maxPlayers less than 2", () => {
			expect(
				decodeClientMessage({
					type: "createRoom",
					settings: { maxPlayers: 1 },
				}),
			).toBeNull();
		});
	});

	describe("updateSettings", () => {
		test("valid updateSettings", () => {
			const result = decodeClientMessage({
				type: "updateSettings",
				settings: { gameId: "tapeworm" },
			});
			expect(result).toEqual({
				type: "updateSettings",
				settings: { gameId: "tapeworm" },
			});
		});

		test("rejects missing settings", () => {
			expect(decodeClientMessage({ type: "updateSettings" })).toBeNull();
		});

		test("rejects maxPlayers less than 2", () => {
			expect(
				decodeClientMessage({
					type: "updateSettings",
					settings: { maxPlayers: 0 },
				}),
			).toBeNull();
		});
	});

	describe("gameAction", () => {
		test("valid gameAction", () => {
			const result = decodeClientMessage({
				type: "gameAction",
				action: { type: "guess", payload: { word: "test" } },
			});
			expect(result).toEqual({
				type: "gameAction",
				action: { type: "guess", payload: { word: "test" } },
			});
		});

		test("rejects missing action", () => {
			expect(decodeClientMessage({ type: "gameAction" })).toBeNull();
		});
	});

	describe("switchTeam", () => {
		test("valid switchTeam", () => {
			expect(decodeClientMessage({ type: "switchTeam", teamId: "team-1" })).toEqual({
				type: "switchTeam",
				teamId: "team-1",
			});
		});

		test("rejects empty teamId", () => {
			expect(decodeClientMessage({ type: "switchTeam", teamId: "" })).toBeNull();
		});
	});

	describe("kickPlayer", () => {
		test("valid kickPlayer", () => {
			expect(
				decodeClientMessage({
					type: "kickPlayer",
					targetPlayerId: "player-123",
				}),
			).toEqual({ type: "kickPlayer", targetPlayerId: "player-123" });
		});

		test("rejects empty targetPlayerId", () => {
			expect(decodeClientMessage({ type: "kickPlayer", targetPlayerId: "" })).toBeNull();
		});
	});

	describe("body-less messages", () => {
		for (const type of ["leaveRoom", "startGame", "returnToLobby", "endGame"] as const) {
			test(`valid ${type}`, () => {
				expect(decodeClientMessage({ type })).toEqual({ type });
			});
		}
	});

	describe("invalid messages", () => {
		test("rejects unknown type", () => {
			expect(decodeClientMessage({ type: "unknown" })).toBeNull();
		});

		test("rejects null", () => {
			expect(decodeClientMessage(null)).toBeNull();
		});

		test("rejects number", () => {
			expect(decodeClientMessage(42)).toBeNull();
		});

		test("rejects string", () => {
			expect(decodeClientMessage("hello")).toBeNull();
		});

		test("rejects empty object", () => {
			expect(decodeClientMessage({})).toBeNull();
		});

		test("rejects non-string type", () => {
			expect(decodeClientMessage({ type: 123 })).toBeNull();
		});
	});
});
