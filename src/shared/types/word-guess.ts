import type { BaseGameAction } from "./game";

// --- Phases & Modes ---

export type WordGuessPhase = "starting" | "explaining" | "roundEnd" | "gameOver";
export type WordGuessMode = "ffa" | "teams";
export type WordGuessDifficulty = 1 | 2 | 3 | "all";

// --- Config (lobby settings -> passed to createInitialState) ---

export interface WordGuessConfig {
	mode: WordGuessMode;
	roundTimeSeconds: number;
	cycles: number;
	wordLanguage: "ru" | "en";
	difficulty: WordGuessDifficulty;
	teams?: Record<string, string[]>; // teamId -> playerIds (teams mode only)
}

export const DEFAULT_WORD_GUESS_CONFIG: WordGuessConfig = {
	mode: "ffa",
	roundTimeSeconds: 60,
	cycles: 1,
	wordLanguage: "ru",
	difficulty: "all",
};

// --- Player State ---

export interface WordGuessPlayerState {
	id: string;
	name: string;
	avatarSeed: number;
	score: number;
	teamId: string | null;
}

// --- Round Result ---

export interface RoundWordResult {
	word: string;
	result: "correct" | "skipped";
	guesserId: string | null;
}

// --- Server-side Full State ---

export interface WordGuessState {
	phase: WordGuessPhase;
	mode: WordGuessMode;

	currentRound: number;
	totalRounds: number;
	explainerOrder: string[];

	currentExplainerId: string;
	currentWord: string;
	wordsUsedByTeam: Record<string, string[]>; // teamId -> used words (FFA uses "__all__")

	roundResults: RoundWordResult[];
	allRoundResults: RoundWordResult[][];

	players: WordGuessPlayerState[];

	teams: Record<string, string[]> | null;
	teamScores: Record<string, number> | null;

	timerEndsAt: number;
	roundTimeSeconds: number;

	wordLanguage: "ru" | "en";
	difficulty: WordGuessDifficulty;
}

// --- Player View (sent to each player via getPlayerView) ---

export interface WordGuessPlayerView {
	phase: WordGuessPhase;
	mode: WordGuessMode;

	currentRound: number;
	totalRounds: number;

	currentExplainerId: string;
	isExplainer: boolean;

	currentWord: string | null;

	players: WordGuessPlayerState[];
	teams: Record<string, string[]> | null;
	teamScores: Record<string, number> | null;

	timerEndsAt: number;

	roundResults: RoundWordResult[];

	roundCorrectCount: number;
	roundSkipCount: number;
}

// --- Actions ---

export interface WordGuessCorrectAction extends BaseGameAction {
	type: "correct";
	guesserId?: string;
}

export interface WordGuessSkipAction extends BaseGameAction {
	type: "skip";
}

export interface WordGuessTimerExpiredAction extends BaseGameAction {
	type: "timerExpired";
}

export interface WordGuessNextRoundAction extends BaseGameAction {
	type: "nextRound";
}

export interface WordGuessBeginRoundAction extends BaseGameAction {
	type: "beginRound";
}

export type WordGuessAction =
	| WordGuessCorrectAction
	| WordGuessSkipAction
	| WordGuessTimerExpiredAction
	| WordGuessNextRoundAction
	| WordGuessBeginRoundAction;
