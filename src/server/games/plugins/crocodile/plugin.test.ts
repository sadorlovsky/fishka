import { beforeEach, describe, expect, mock, test } from "bun:test";
import { ROUND_START_COUNTDOWN_MS } from "@/shared/constants";
import type {
	CrocodileConfig,
	CrocodilePlayerView,
	CrocodileState,
} from "@/shared/types/crocodile";
import type { PlayerInfo } from "@/shared/types/room";

// Mock getWord to return predictable words
let wordCounter = 0;
mock.module("../word-guess/words", () => ({
	getWord: () => `word-${++wordCounter}`,
}));

// Import plugin AFTER mock is set up
const { crocodilePlugin: plugin } = await import("./plugin");

// --- Helpers ---

function makePlayers(count: number): PlayerInfo[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `p${i + 1}`,
		name: `Player ${i + 1}`,
		avatarSeed: i * 30,
		isHost: i === 0,
		isConnected: true,
		isSpectator: false,
	}));
}

const defaultConfig: CrocodileConfig = {
	roundTimeSeconds: 60,
	cycles: 1,
	wordLanguage: "ru",
	difficulty: "all",
};

function createState(playerCount = 3, config?: Partial<CrocodileConfig>): CrocodileState {
	return plugin.createInitialState(makePlayers(playerCount), {
		...defaultConfig,
		...config,
	});
}

function beginRound(state: CrocodileState): CrocodileState {
	return plugin.reduce(state, { type: "beginRound" }, "__server__")!;
}

function showingState(playerCount = 3, config?: Partial<CrocodileConfig>): CrocodileState {
	return beginRound(createState(playerCount, config));
}

beforeEach(() => {
	wordCounter = 0;
});

// --- Tests ---

describe("crocodilePlugin", () => {
	describe("createInitialState", () => {
		test("correct initial state for 3 players", () => {
			const state = createState(3);

			expect(state.phase).toBe("starting");
			expect(state.currentRound).toBe(1);
			expect(state.totalRounds).toBe(3); // 3 players × 1 cycle
			expect(state.showerOrder).toHaveLength(3);
			expect(state.currentShowerId).toBe(state.showerOrder[0]!);
			expect(state.currentWord).toBeDefined();
			expect(state.usedWords).toHaveLength(1);
			expect(state.guessedPlayerIds).toHaveLength(0);
			expect(state.players).toHaveLength(3);
		});

		test("2 cycles doubles total rounds", () => {
			const state = createState(3, { cycles: 2 });

			expect(state.totalRounds).toBe(6);
			expect(state.showerOrder).toHaveLength(6);
		});

		test("all players in shower order", () => {
			const state = createState(3);
			const ids = new Set(state.showerOrder);

			expect(ids.has("p1")).toBe(true);
			expect(ids.has("p2")).toBe(true);
			expect(ids.has("p3")).toBe(true);
		});

		test("all players start with score 0", () => {
			const state = createState(3);

			for (const p of state.players) {
				expect(p.score).toBe(0);
			}
		});

		test("timerEndsAt is approximately now + ROUND_START_COUNTDOWN_MS", () => {
			const before = Date.now();
			const state = createState(3);
			const after = Date.now();

			expect(state.timerEndsAt).toBeGreaterThanOrEqual(before + ROUND_START_COUNTDOWN_MS);
			expect(state.timerEndsAt).toBeLessThanOrEqual(after + ROUND_START_COUNTDOWN_MS);
		});

		test("custom roundTimeSeconds applied", () => {
			const state = createState(3, { roundTimeSeconds: 90 });
			expect(state.roundTimeSeconds).toBe(90);
		});
	});

	describe("beginRound", () => {
		test("transitions from starting to showing", () => {
			const state = createState(3);
			const next = beginRound(state);
			expect(next.phase).toBe("showing");
		});

		test("sets timerEndsAt to now + roundTimeSeconds", () => {
			const before = Date.now();
			const state = createState(3);
			const next = beginRound(state);
			const after = Date.now();

			const expected = state.roundTimeSeconds * 1000;
			expect(next.timerEndsAt).toBeGreaterThanOrEqual(before + expected);
			expect(next.timerEndsAt).toBeLessThanOrEqual(after + expected);
		});

		test("rejects non-server caller", () => {
			const state = createState(3);
			expect(plugin.validateAction(state, { type: "beginRound" }, "p1")).toBe(
				"Only server can begin round",
			);
		});

		test("rejects if not in starting phase", () => {
			const state = showingState(3);
			expect(plugin.validateAction(state, { type: "beginRound" }, "__server__")).toBe(
				"Not in starting phase",
			);
		});
	});

	describe("validateAction — markCorrect", () => {
		test("allows shower to mark a guesser", () => {
			const state = showingState(3);
			const shower = state.currentShowerId;
			const guesser = state.players.find((p) => p.id !== shower)!.id;

			expect(
				plugin.validateAction(state, { type: "markCorrect", guesserId: guesser }, shower),
			).toBeNull();
		});

		test("rejects non-shower", () => {
			const state = showingState(3);
			const nonShower = state.players.find((p) => p.id !== state.currentShowerId)!.id;

			expect(
				plugin.validateAction(state, { type: "markCorrect", guesserId: "p1" }, nonShower),
			).not.toBeNull();
		});

		test("rejects outside showing phase", () => {
			const state = createState(3); // still in "starting"
			const shower = state.currentShowerId;
			const guesser = state.players.find((p) => p.id !== shower)!.id;

			expect(
				plugin.validateAction(state, { type: "markCorrect", guesserId: guesser }, shower),
			).toBe("Not in showing phase");
		});

		test("rejects marking shower themselves", () => {
			const state = showingState(3);
			const shower = state.currentShowerId;

			expect(plugin.validateAction(state, { type: "markCorrect", guesserId: shower }, shower)).toBe(
				"Shower cannot mark themselves",
			);
		});

		test("rejects unknown player", () => {
			const state = showingState(3);
			const shower = state.currentShowerId;

			expect(
				plugin.validateAction(state, { type: "markCorrect", guesserId: "unknown" }, shower),
			).toBe("Player not found");
		});

		test("rejects markCorrect after round ended (first guesser already won)", () => {
			const state = showingState(3);
			const shower = state.currentShowerId;
			const guesser = state.players.find((p) => p.id !== shower)!.id;

			// Mark correct — round ends immediately
			const next = plugin.reduce(state, { type: "markCorrect", guesserId: guesser }, shower)!;

			// Can't mark another — not in showing phase anymore
			const other = state.players.find((p) => p.id !== shower && p.id !== guesser)!.id;
			expect(plugin.validateAction(next, { type: "markCorrect", guesserId: other }, shower)).toBe(
				"Not in showing phase",
			);
		});
	});

	describe("validateAction — timerExpired", () => {
		test("allows server in showing phase", () => {
			const state = showingState(3);
			expect(plugin.validateAction(state, { type: "timerExpired" }, "__server__")).toBeNull();
		});

		test("rejects regular player", () => {
			const state = showingState(3);
			expect(plugin.validateAction(state, { type: "timerExpired" }, "p1")).toBe(
				"Only server can expire timer",
			);
		});

		test("rejects outside showing phase", () => {
			const state = createState(3);
			expect(plugin.validateAction(state, { type: "timerExpired" }, "__server__")).toBe(
				"Not in showing phase",
			);
		});
	});

	describe("validateAction — nextRound", () => {
		test("allows server in roundEnd phase", () => {
			let state = showingState(3);
			state = plugin.reduce(state, { type: "timerExpired" }, "__server__")!;
			expect(plugin.validateAction(state, { type: "nextRound" }, "__server__")).toBeNull();
		});

		test("rejects outside roundEnd", () => {
			const state = showingState(3);
			expect(plugin.validateAction(state, { type: "nextRound" }, "__server__")).toBe(
				"Not in round end phase",
			);
		});

		test("rejects regular player", () => {
			let state = showingState(3);
			state = plugin.reduce(state, { type: "timerExpired" }, "__server__")!;
			expect(plugin.validateAction(state, { type: "nextRound" }, "p1")).toBe(
				"Only server can advance round",
			);
		});
	});

	describe("validateAction — unknown", () => {
		test("rejects unknown action type", () => {
			const state = createState(3);
			expect(plugin.validateAction(state, { type: "banana" } as any, "p1")).toBe("Unknown action");
		});
	});

	describe("reduce — markCorrect", () => {
		test("awards +1 to guesser only, not shower", () => {
			const state = showingState(3);
			const shower = state.currentShowerId;
			const guesser = state.players.find((p) => p.id !== shower)!.id;

			const next = plugin.reduce(state, { type: "markCorrect", guesserId: guesser }, shower)!;

			expect(next.players.find((p) => p.id === guesser)!.score).toBe(1);
			expect(next.players.find((p) => p.id === shower)!.score).toBe(0);
		});

		test("adds guesserId to guessedPlayerIds", () => {
			const state = showingState(3);
			const shower = state.currentShowerId;
			const guesser = state.players.find((p) => p.id !== shower)!.id;

			const next = plugin.reduce(state, { type: "markCorrect", guesserId: guesser }, shower)!;

			expect(next.guessedPlayerIds).toContain(guesser);
		});

		test("immediately transitions to roundEnd (first guesser wins)", () => {
			const state = showingState(3);
			const shower = state.currentShowerId;
			const guesser = state.players.find((p) => p.id !== shower)!.id;

			const next = plugin.reduce(state, { type: "markCorrect", guesserId: guesser }, shower)!;

			expect(next.phase).toBe("roundEnd");
			expect(next.guessedPlayerIds).toHaveLength(1);
		});

		test("with 2 players: markCorrect ends round", () => {
			const state = showingState(2);
			const shower = state.currentShowerId;
			const guesser = state.players.find((p) => p.id !== shower)!.id;

			const next = plugin.reduce(state, { type: "markCorrect", guesserId: guesser }, shower)!;

			expect(next.phase).toBe("roundEnd");
			expect(next.players.find((p) => p.id === guesser)!.score).toBe(1);
			expect(next.players.find((p) => p.id === shower)!.score).toBe(0);
		});
	});

	describe("reduce — timerExpired", () => {
		test("transitions to roundEnd", () => {
			const state = showingState(3);
			const next = plugin.reduce(state, { type: "timerExpired" }, "__server__")!;
			expect(next.phase).toBe("roundEnd");
		});

		test("no scores awarded when timer expires", () => {
			const state = showingState(3);
			const next = plugin.reduce(state, { type: "timerExpired" }, "__server__")!;

			for (const p of next.players) {
				expect(p.score).toBe(0);
			}
		});
	});

	describe("reduce — nextRound", () => {
		test("advances to next round", () => {
			let state = showingState(3);
			state = plugin.reduce(state, { type: "timerExpired" }, "__server__")!;

			const next = plugin.reduce(state, { type: "nextRound" }, "__server__")!;

			expect(next.phase).toBe("starting");
			expect(next.currentRound).toBe(2);
			expect(next.currentShowerId).toBe(state.showerOrder[1]!);
			expect(next.guessedPlayerIds).toHaveLength(0);
		});

		test("picks new word", () => {
			let state = showingState(3);
			const oldWord = state.currentWord;
			state = plugin.reduce(state, { type: "timerExpired" }, "__server__")!;

			const next = plugin.reduce(state, { type: "nextRound" }, "__server__")!;

			expect(next.currentWord).not.toBe(oldWord);
			expect(next.usedWords).toContain(next.currentWord);
		});

		test("transitions to gameOver on last round", () => {
			let state = showingState(3);
			state = {
				...state,
				phase: "roundEnd" as const,
				currentRound: 3,
				totalRounds: 3,
			};

			const next = plugin.reduce(state, { type: "nextRound" }, "__server__")!;
			expect(next.phase).toBe("gameOver");
		});
	});

	describe("getPlayerView", () => {
		test("shower sees word in showing phase", () => {
			const state = showingState(3);
			const view = plugin.getPlayerView(state, state.currentShowerId) as CrocodilePlayerView;

			expect(view.currentWord).toBe(state.currentWord);
			expect(view.isShower).toBe(true);
		});

		test("shower does not see word in starting phase", () => {
			const state = createState(3);
			const view = plugin.getPlayerView(state, state.currentShowerId) as CrocodilePlayerView;

			expect(view.currentWord).toBeNull();
		});

		test("non-shower does not see word", () => {
			const state = showingState(3);
			const other = state.players.find((p) => p.id !== state.currentShowerId)!.id;
			const view = plugin.getPlayerView(state, other) as CrocodilePlayerView;

			expect(view.currentWord).toBeNull();
			expect(view.isShower).toBe(false);
		});

		test("includes guessedPlayerIds", () => {
			const state = showingState(3);
			const shower = state.currentShowerId;
			const guesser = state.players.find((p) => p.id !== shower)!.id;

			const next = plugin.reduce(state, { type: "markCorrect", guesserId: guesser }, shower)!;
			const view = plugin.getPlayerView(next, shower) as CrocodilePlayerView;

			expect(view.guessedPlayerIds).toContain(guesser);
		});
	});

	describe("getSpectatorView", () => {
		test("always sees the word", () => {
			const state = showingState(3);
			const view = plugin.getSpectatorView(state) as CrocodilePlayerView;

			expect(view.currentWord).toBe(state.currentWord);
			expect(view.isShower).toBe(false);
		});
	});

	describe("getTimerConfig", () => {
		test("starting: returns beginRound config", () => {
			const state = createState(3);
			const config = plugin.getTimerConfig!(state);

			expect(config).not.toBeNull();
			expect(config!.key).toBe("starting-1");
			expect(config!.action).toEqual({ type: "beginRound" });
		});

		test("showing: returns timerExpired config", () => {
			const state = showingState(3);
			const config = plugin.getTimerConfig!(state);

			expect(config).not.toBeNull();
			expect(config!.key).toBe("showing-1");
			expect(config!.action).toEqual({ type: "timerExpired" });
		});

		test("roundEnd: returns nextRound config", () => {
			let state = showingState(3);
			state = plugin.reduce(state, { type: "timerExpired" }, "__server__")!;
			const config = plugin.getTimerConfig!(state);

			expect(config).not.toBeNull();
			expect(config!.key).toBe("roundEnd-1");
			expect(config!.action).toEqual({ type: "nextRound" });
		});

		test("gameOver: returns null", () => {
			const state = { ...showingState(3), phase: "gameOver" as const };
			const config = plugin.getTimerConfig!(state);
			expect(config).toBeNull();
		});
	});

	describe("isGameOver", () => {
		test("true when phase is gameOver", () => {
			const state = { ...createState(3), phase: "gameOver" as const };
			expect(plugin.isGameOver(state)).toBe(true);
		});

		test("false for other phases", () => {
			expect(plugin.isGameOver(createState(3))).toBe(false);
			expect(plugin.isGameOver(showingState(3))).toBe(false);
		});
	});

	describe("full game flow", () => {
		test("3 players, 1 cycle: complete game", () => {
			let state = showingState(3);
			const shower1 = state.currentShowerId;
			const guessers1 = state.players.filter((p) => p.id !== shower1);

			// Round 1: first guesser wins → round ends immediately
			state = plugin.reduce(state, { type: "markCorrect", guesserId: guessers1[0]!.id }, shower1)!;
			expect(state.phase).toBe("roundEnd");

			// Scores: only guesser gets +1
			expect(state.players.find((p) => p.id === shower1)!.score).toBe(0);
			expect(state.players.find((p) => p.id === guessers1[0]!.id)!.score).toBe(1);

			// Round 2
			state = plugin.reduce(state, { type: "nextRound" }, "__server__")!;
			expect(state.currentRound).toBe(2);
			state = beginRound(state);

			const shower2 = state.currentShowerId;
			const guessers2 = state.players.filter((p) => p.id !== shower2);

			// First guesser wins → round ends
			state = plugin.reduce(state, { type: "markCorrect", guesserId: guessers2[1]!.id }, shower2)!;
			expect(state.phase).toBe("roundEnd");

			// Round 3
			state = plugin.reduce(state, { type: "nextRound" }, "__server__")!;
			expect(state.currentRound).toBe(3);
			state = beginRound(state);

			// Timer expires — nobody scores
			state = plugin.reduce(state, { type: "timerExpired" }, "__server__")!;
			expect(state.phase).toBe("roundEnd");

			// Game over
			state = plugin.reduce(state, { type: "nextRound" }, "__server__")!;
			expect(state.phase).toBe("gameOver");
			expect(plugin.isGameOver(state)).toBe(true);

			// Total scores: 2 guessers got +1 each, no shower points
			const totalScore = state.players.reduce((sum, p) => sum + p.score, 0);
			expect(totalScore).toBe(2);
		});
	});
});
