import { ROUND_END_DELAY_MS, ROUND_START_COUNTDOWN_MS } from "@/shared/constants";
import type {
	CrocodileAction,
	CrocodileConfig,
	CrocodilePlayerView,
	CrocodileState,
} from "@/shared/types/crocodile";
import { DEFAULT_CROCODILE_CONFIG } from "@/shared/types/crocodile";
import type { GamePlugin, TimerConfig } from "@/shared/types/game";
import type { PlayerInfo } from "@/shared/types/room";
import { getWord } from "../word-guess/words";

function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j]!, result[i]!];
	}
	return result;
}

function nextWord(language: string, difficulty: number | null, usedWords: string[]): string {
	for (let i = 0; i < 20; i++) {
		const word = getWord(language, difficulty);
		if (!usedWords.includes(word)) {
			return word;
		}
	}
	return getWord(language, difficulty);
}

export const crocodilePlugin: GamePlugin<CrocodileState, CrocodileAction, CrocodileConfig> = {
	id: "crocodile",
	name: "Крокодил",
	minPlayers: 2,
	maxPlayers: 12,
	defaultConfig: DEFAULT_CROCODILE_CONFIG,

	createInitialState(players: PlayerInfo[], config: CrocodileConfig): CrocodileState {
		const merged = { ...DEFAULT_CROCODILE_CONFIG, ...config };
		const ids = players.map((p) => p.id);

		// Build shower order: shuffle, repeat for each cycle
		const showerOrder: string[] = [];
		for (let cycle = 0; cycle < merged.cycles; cycle++) {
			showerOrder.push(...shuffle(ids));
		}

		const diff = merged.difficulty === "all" ? null : merged.difficulty;
		const firstWord = nextWord(merged.wordLanguage, diff, []);

		return {
			phase: "starting",
			currentRound: 1,
			totalRounds: showerOrder.length,
			showerOrder,
			currentShowerId: showerOrder[0]!,
			currentWord: firstWord,
			usedWords: [firstWord],
			guessedPlayerIds: [],
			players: players.map((p) => ({
				id: p.id,
				name: p.name,
				avatarSeed: p.avatarSeed,
				score: 0,
			})),
			timerEndsAt: Date.now() + ROUND_START_COUNTDOWN_MS,
			roundTimeSeconds: merged.roundTimeSeconds,
			wordLanguage: merged.wordLanguage,
			difficulty: merged.difficulty,
		};
	},

	validateAction(state: CrocodileState, action: CrocodileAction, playerId: string): string | null {
		switch (action.type) {
			case "markCorrect": {
				if (state.phase !== "showing") {
					return "Not in showing phase";
				}
				if (playerId !== state.currentShowerId) {
					return "Only the shower can mark correct";
				}
				if (action.guesserId === state.currentShowerId) {
					return "Shower cannot mark themselves";
				}
				if (!state.players.some((p) => p.id === action.guesserId)) {
					return "Player not found";
				}
				if (state.guessedPlayerIds.includes(action.guesserId)) {
					return "Player already guessed correctly";
				}
				return null;
			}
			case "beginRound": {
				if (playerId !== "__server__") {
					return "Only server can begin round";
				}
				if (state.phase !== "starting") {
					return "Not in starting phase";
				}
				return null;
			}
			case "timerExpired": {
				if (playerId !== "__server__") {
					return "Only server can expire timer";
				}
				if (state.phase !== "showing") {
					return "Not in showing phase";
				}
				return null;
			}
			case "nextRound": {
				if (playerId !== "__server__") {
					return "Only server can advance round";
				}
				if (state.phase !== "roundEnd") {
					return "Not in round end phase";
				}
				return null;
			}
			default:
				return "Unknown action";
		}
	},

	reduce(state: CrocodileState, action: CrocodileAction, _playerId: string): CrocodileState | null {
		switch (action.type) {
			case "beginRound": {
				return {
					...state,
					phase: "showing",
					timerEndsAt: Date.now() + state.roundTimeSeconds * 1000,
				};
			}

			case "markCorrect": {
				// First guesser wins — round ends immediately, +1 to guesser only
				const players = state.players.map((p) => {
					if (p.id === action.guesserId) {
						return { ...p, score: p.score + 1 };
					}
					return p;
				});

				return {
					...state,
					phase: "roundEnd",
					guessedPlayerIds: [action.guesserId],
					players,
					timerEndsAt: Date.now() + ROUND_END_DELAY_MS,
				};
			}

			case "timerExpired": {
				return {
					...state,
					phase: "roundEnd",
					timerEndsAt: Date.now() + ROUND_END_DELAY_MS,
				};
			}

			case "nextRound": {
				if (state.currentRound >= state.totalRounds) {
					return {
						...state,
						phase: "gameOver",
					};
				}

				const nextRound = state.currentRound + 1;
				const nextShowerId = state.showerOrder[nextRound - 1]!;
				const diff = state.difficulty === "all" ? null : state.difficulty;
				const word = nextWord(state.wordLanguage, diff, state.usedWords);

				return {
					...state,
					phase: "starting",
					currentRound: nextRound,
					currentShowerId: nextShowerId,
					currentWord: word,
					usedWords: [...state.usedWords, word],
					guessedPlayerIds: [],
					timerEndsAt: Date.now() + ROUND_START_COUNTDOWN_MS,
				};
			}

			default:
				return null;
		}
	},

	getPlayerView(state: CrocodileState, playerId: string): CrocodilePlayerView {
		const isShower = playerId === state.currentShowerId;
		const showWord = state.phase === "showing" && isShower;

		return {
			phase: state.phase,
			currentRound: state.currentRound,
			totalRounds: state.totalRounds,
			currentShowerId: state.currentShowerId,
			isShower,
			currentWord: showWord ? state.currentWord : null,
			guessedPlayerIds: state.guessedPlayerIds,
			players: state.players,
			timerEndsAt: state.timerEndsAt,
		};
	},

	getSpectatorView(state: CrocodileState): CrocodilePlayerView {
		return {
			phase: state.phase,
			currentRound: state.currentRound,
			totalRounds: state.totalRounds,
			currentShowerId: state.currentShowerId,
			isShower: false,
			currentWord: state.currentWord,
			guessedPlayerIds: state.guessedPlayerIds,
			players: state.players,
			timerEndsAt: state.timerEndsAt,
		};
	},

	getServerActions(): CrocodileAction[] {
		return [];
	},

	isGameOver(state: CrocodileState): boolean {
		return state.phase === "gameOver";
	},

	shouldPauseOnDisconnect(): boolean {
		return true;
	},

	getTimerConfig(state: CrocodileState): TimerConfig | null {
		if (state.phase === "starting") {
			const delay = state.timerEndsAt - Date.now();
			if (delay > 0) {
				return {
					key: `starting-${state.currentRound}`,
					durationMs: delay,
					action: { type: "beginRound" },
				};
			}
		}
		if (state.phase === "showing") {
			const delay = state.timerEndsAt - Date.now();
			if (delay > 0) {
				return {
					key: `showing-${state.currentRound}`,
					durationMs: delay,
					action: { type: "timerExpired" },
				};
			}
		}
		if (state.phase === "roundEnd") {
			const delay = state.timerEndsAt - Date.now();
			if (delay > 0) {
				return {
					key: `roundEnd-${state.currentRound}`,
					durationMs: delay,
					action: { type: "nextRound" },
				};
			}
		}
		return null;
	},
};
