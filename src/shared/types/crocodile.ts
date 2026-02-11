import type { BaseGameAction } from "./game";

// --- Phases ---

export type CrocodilePhase = "starting" | "showing" | "roundEnd" | "gameOver";
export type CrocodileDifficulty = 1 | 2 | 3 | "all";

// --- Config (lobby settings -> passed to createInitialState) ---

export type CrocodileMode = "gestures" | "drawing";

export interface CrocodileConfig {
	mode: CrocodileMode;
	roundTimeSeconds: number;
	cycles: number;
	wordLanguage: "ru" | "en";
	difficulty: CrocodileDifficulty;
}

export const DEFAULT_CROCODILE_CONFIG: CrocodileConfig = {
	mode: "gestures",
	roundTimeSeconds: 60,
	cycles: 1,
	wordLanguage: "ru",
	difficulty: "all",
};

// --- Player State ---

export interface CrocodilePlayerState {
	id: string;
	name: string;
	avatarSeed: number;
	score: number;
}

// --- Server-side Full State ---

export interface CrocodileState {
	phase: CrocodilePhase;

	currentRound: number;
	totalRounds: number;
	showerOrder: string[];

	currentShowerId: string;
	currentWord: string;
	usedWords: string[];
	guessedPlayerIds: string[];

	players: CrocodilePlayerState[];

	timerEndsAt: number;
	roundTimeSeconds: number;

	wordLanguage: "ru" | "en";
	difficulty: CrocodileDifficulty;
}

// --- Player View (sent to each player via getPlayerView) ---

export interface CrocodilePlayerView {
	phase: CrocodilePhase;

	currentRound: number;
	totalRounds: number;

	currentShowerId: string;
	isShower: boolean;

	currentWord: string | null;

	guessedPlayerIds: string[];
	players: CrocodilePlayerState[];

	timerEndsAt: number;
}

// --- Actions ---

export interface CrocodileBeginRoundAction extends BaseGameAction {
	type: "beginRound";
}

export interface CrocodileMarkCorrectAction extends BaseGameAction {
	type: "markCorrect";
	guesserId: string;
}

export interface CrocodileSkipAction extends BaseGameAction {
	type: "skip";
}

export interface CrocodileTimerExpiredAction extends BaseGameAction {
	type: "timerExpired";
}

export interface CrocodileNextRoundAction extends BaseGameAction {
	type: "nextRound";
}

export type CrocodileAction =
	| CrocodileBeginRoundAction
	| CrocodileMarkCorrectAction
	| CrocodileSkipAction
	| CrocodileTimerExpiredAction
	| CrocodileNextRoundAction;
