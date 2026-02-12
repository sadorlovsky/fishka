import type { BaseGameAction } from "./game";

// --- Directions & Colors ---

export type Direction = "top" | "right" | "bottom" | "left";
export type WormColor = "black" | "pink" | "red" | "white";
export type KnifeColor = WormColor | "rainbow";
export type Rotation = 0 | 90 | 180 | 270;

// --- Card Properties ---

export type CardTrait = "START" | "DIG" | "SWAP" | "HATCH" | "PEEK" | "CUT";

export interface CardProperty {
	trait: CardTrait;
	multiplier: 1 | 2;
}

// --- Card Definition ---

export type CardType = "straight" | "corner" | "t-junction" | "cross" | "head" | "knife";

export interface CardPath {
	directions: Direction[];
	color: WormColor;
}

export interface CardDefinition {
	type: CardType;
	paths: CardPath[];
	property?: CardProperty;
	knifeColor?: KnifeColor;
}

export interface HandCard {
	id: string;
	card: CardDefinition;
}

export interface PlacedCard {
	cardId: string;
	card: CardDefinition;
	rotation: Rotation;
}

// --- Config ---

export interface TapewormConfig {
	handSize: number;
}

export const DEFAULT_TAPEWORM_CONFIG: TapewormConfig = {
	handSize: 5,
};

// --- Phases ---

export type TapewormPhase =
	| "playing"
	| "discarding"
	| "digging"
	| "swapping"
	| "hatching"
	| "peeking"
	| "cutting"
	| "gameOver";

// --- Player State ---

export interface TapewormPlayerState {
	id: string;
	name: string;
	avatarSeed: number;
	handSize: number;
}

// --- Property Resolution ---

export type SwapStep = "pickPlayer" | "decideExchange" | "giveCard";

export interface PendingPropertyResolution {
	trait: CardTrait;
	remainingActivations: number;
	playerId: string;
	swapStep?: SwapStep;
	swapTargetPlayerId?: string;
	cutColor?: KnifeColor;
}

// --- Server-side Full State ---

export interface PendingDiscard {
	playerId: string;
	count: number;
}

export interface TapewormState {
	phase: TapewormPhase;
	board: Record<string, PlacedCard>;
	deck: HandCard[];
	hands: Record<string, HandCard[]>;
	turnOrder: string[];
	currentPlayerIndex: number;
	currentPlayerId: string;
	hasDrawn: boolean;
	chainColor: WormColor | null;
	lastPlacedPosition: { x: number; y: number } | null;
	cardsPlayedThisTurn: number;
	players: TapewormPlayerState[];
	winnerId: string | null;
	pendingDiscard: PendingDiscard | null;
	pendingProperty: PendingPropertyResolution | null;
}

// --- Valid Placement (computed for client) ---

export interface ValidPlacement {
	x: number;
	y: number;
	rotation: Rotation;
}

// --- CUT Target ---

export interface CutTarget {
	x: number;
	y: number;
	direction: Direction;
	color: WormColor;
}

// --- Player View ---

export interface TapewormPlayerView {
	phase: TapewormPhase;
	board: Record<string, PlacedCard>;
	hand: HandCard[];
	players: TapewormPlayerState[];
	turnOrder: string[];
	currentPlayerId: string;
	isMyTurn: boolean;
	hasDrawn: boolean;
	chainColor: WormColor | null;
	cardsPlayedThisTurn: number;
	deckSize: number;
	validPlacements: Record<string, ValidPlacement[]>;
	winnerId: string | null;
	pendingDiscard: PendingDiscard | null;
	pendingProperty: PendingPropertyResolution | null;
	swapTargetHand?: HandCard[];
	validCutTargets?: CutTarget[];
	playableKnives: string[];
	knifeCutTargets?: Record<string, CutTarget[]>;
}

// --- Actions ---

export interface TapewormPlaceTileAction extends BaseGameAction {
	type: "placeTile";
	cardId: string;
	x: number;
	y: number;
	rotation: Rotation;
}

export interface TapewormEndTurnAction extends BaseGameAction {
	type: "endTurn";
}

export interface TapewormDiscardAction extends BaseGameAction {
	type: "discardCards";
	cardIds: string[];
}

export interface TapewormPlayKnifeAction extends BaseGameAction {
	type: "playKnife";
	cardId: string;
}

export interface TapewormCutAction extends BaseGameAction {
	type: "cutSegment";
	x: number;
	y: number;
	direction: Direction;
}

export interface TapewormPlayKnifeAndCutAction extends BaseGameAction {
	type: "playKnifeAndCut";
	cardId: string;
	x: number;
	y: number;
	direction: Direction;
}

export interface TapewormDigDiscardAction extends BaseGameAction {
	type: "digDiscard";
	cardId: string;
}

export interface TapewormSwapPickPlayerAction extends BaseGameAction {
	type: "swapPickPlayer";
	targetPlayerId: string;
}

export interface TapewormSwapTakeCardAction extends BaseGameAction {
	type: "swapTakeCard";
	cardId: string | null;
}

export interface TapewormSwapGiveCardAction extends BaseGameAction {
	type: "swapGiveCard";
	cardId: string;
}

export interface TapewormHatchAction extends BaseGameAction {
	type: "hatchTarget";
	targetPlayerId: string;
}

export interface TapewormPeekReturnAction extends BaseGameAction {
	type: "peekReturn";
	cardId: string;
}

export type TapewormAction =
	| TapewormPlaceTileAction
	| TapewormEndTurnAction
	| TapewormDiscardAction
	| TapewormPlayKnifeAction
	| TapewormCutAction
	| TapewormPlayKnifeAndCutAction
	| TapewormDigDiscardAction
	| TapewormSwapPickPlayerAction
	| TapewormSwapTakeCardAction
	| TapewormSwapGiveCardAction
	| TapewormHatchAction
	| TapewormPeekReturnAction;
