import type { PlayerInfo } from "./room";

export interface GamePlugin<TState = unknown, TAction = unknown, TConfig = unknown> {
	id: string;
	name: string;
	minPlayers: number;
	maxPlayers: number;
	defaultConfig: TConfig;

	createInitialState(players: PlayerInfo[], config: TConfig): TState;

	reduce(state: TState, action: TAction, playerId: string): TState | null;

	validateAction(state: TState, action: TAction, playerId: string): string | null;

	getPlayerView(state: TState, playerId: string): unknown;
	getSpectatorView(state: TState): unknown;

	getServerActions(state: TState): TAction[];

	isGameOver(state: TState): boolean;

	getTimerConfig?(state: TState): TimerConfig | null;

	shouldPauseOnDisconnect?(state: TState, disconnectedPlayerId: string): boolean;
}

export interface PauseInfo {
	disconnectedPlayerId: string;
	disconnectedPlayerName: string;
	pausedAt: number;
	timeoutAt: number;
}

export interface BaseGameAction {
	type: string;
}

export interface TimerConfig {
	key: string;
	durationMs: number;
	action: BaseGameAction;
}
