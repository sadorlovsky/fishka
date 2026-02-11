import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	pointerWithin,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	HandCard,
	Rotation,
	TapewormPlayerView,
	ValidPlacement,
} from "@/shared/types/tapeworm";
import { useConnection } from "../../contexts/ConnectionContext";
import { pluralWord } from "../../utils/plural";
import { Board } from "./Board";
import { CardView } from "./CardView";
import { GameOver } from "./GameOver";
import { Hand } from "./Hand";
import { TableSeating } from "./TableSeating";
import "./Tapeworm.css";

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

function cycleRotation(current: Rotation, dir: 1 | -1 = 1): Rotation {
	return ROTATIONS[(ROTATIONS.indexOf(current) + dir + 4) % 4]!;
}

const COLOR_NAMES: Record<string, string> = {
	black: "чёрный",
	pink: "розовый",
	red: "красный",
	white: "белый",
};

function pluralCards(n: number): string {
	return pluralWord(n, "карта", "карты", "карт");
}

export function TapewormGame() {
	const { gameState, playerId, room, send } = useConnection();
	const state = gameState as TapewormPlayerView | null;

	const [activeCardId, setActiveCardId] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [cardRotations, setCardRotations] = useState<Record<string, Rotation>>({});
	const [_pendingDrop, setPendingDrop] = useState<{
		x: number;
		y: number;
	} | null>(null);

	// Track card IDs dismissed by user action (placeTile, playKnife)
	// so the animation hook skips exit animations for them.
	const dismissedCardIdsRef = useRef<Set<string>>(new Set());
	const [dismissedCardIds, setDismissedCardIds] = useState<Set<string>>(new Set());
	const dismissCard = useCallback((cardId: string) => {
		dismissedCardIdsRef.current.add(cardId);
		setDismissedCardIds(new Set(dismissedCardIdsRef.current));
		// Clean up after animation window passes
		setTimeout(() => {
			dismissedCardIdsRef.current.delete(cardId);
			setDismissedCardIds(new Set(dismissedCardIdsRef.current));
		}, 500);
	}, []);

	const activeRotation: Rotation = activeCardId ? (cardRotations[activeCardId] ?? 0) : 0;

	const setActiveRotation = useCallback(
		(updater: Rotation | ((prev: Rotation) => Rotation)) => {
			if (!activeCardId) {
				return;
			}
			setCardRotations((prev) => {
				const current = prev[activeCardId] ?? 0;
				const next = typeof updater === "function" ? updater(current) : updater;
				return { ...prev, [activeCardId]: next };
			});
		},
		[activeCardId],
	);

	const isHost = room?.hostId === playerId;

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

	const dispatch = useCallback(
		(action: unknown) => {
			send({ type: "gameAction", action });
		},
		[send],
	);

	// Keyboard: R to rotate when card is selected
	useEffect(() => {
		if (!activeCardId) {
			return;
		}
		const handler = (e: KeyboardEvent) => {
			if (e.key === "r" || e.key === "R") {
				e.preventDefault();
				setActiveRotation((r) => cycleRotation(r, e.shiftKey ? -1 : 1));
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [activeCardId, setActiveRotation]);

	// Wheel: rotate during drag
	useEffect(() => {
		if (!isDragging) {
			return;
		}
		const handler = (e: WheelEvent) => {
			e.preventDefault();
			setActiveRotation((r) => cycleRotation(r, e.deltaY > 0 ? 1 : -1));
		};
		document.addEventListener("wheel", handler, { passive: false });
		return () => document.removeEventListener("wheel", handler);
	}, [isDragging, setActiveRotation]);

	const doPlaceTile = useCallback(
		(cardId: string, x: number, y: number, rotation: Rotation) => {
			dismissCard(cardId);
			dispatch({ type: "placeTile", cardId, x, y, rotation });
			setActiveCardId(null);
			setCardRotations((prev) => {
				const { [cardId]: _, ...rest } = prev;
				return rest;
			});
			setPendingDrop(null);
		},
		[dispatch, dismissCard],
	);

	const handlePlaceTile = useCallback(
		(x: number, y: number, rotation: Rotation) => {
			if (!activeCardId) {
				return;
			}
			doPlaceTile(activeCardId, x, y, rotation);
		},
		[activeCardId, doPlaceTile],
	);

	const handleEndTurn = useCallback(() => {
		dispatch({ type: "endTurn" });
		setActiveCardId(null);
		setCardRotations({});
		setPendingDrop(null);
	}, [dispatch]);

	// Discard state for ringworm
	const [discardSelection, setDiscardSelection] = useState<string[]>([]);

	const handleDiscard = useCallback(() => {
		dispatch({ type: "discardCards", cardIds: discardSelection });
		setDiscardSelection([]);
	}, [dispatch, discardSelection]);

	const toggleDiscardCard = useCallback(
		(cardId: string) => {
			setDiscardSelection((prev) => {
				if (prev.includes(cardId)) {
					return prev.filter((id) => id !== cardId);
				}
				if (prev.length >= (state?.pendingDiscard?.count ?? 2)) {
					return prev;
				}
				return [...prev, cardId];
			});
		},
		[state?.pendingDiscard?.count],
	);

	// Valid placements for the active card
	const activePlacements: ValidPlacement[] = useMemo(() => {
		if (!state || !activeCardId) {
			return [];
		}
		return state.validPlacements[activeCardId] ?? [];
	}, [state, activeCardId]);

	// Group placements by position for quick lookup
	const placementsByPos = useMemo(() => {
		const map = new Map<string, Rotation[]>();
		for (const placement of activePlacements) {
			const k = `${placement.x},${placement.y}`;
			const arr = map.get(k) ?? [];
			arr.push(placement.rotation);
			map.set(k, arr);
		}
		return map;
	}, [activePlacements]);

	// DnD handlers
	const handleDragStart = useCallback((event: DragStartEvent) => {
		const cardId = String(event.active.id);
		setActiveCardId(cardId);
		setIsDragging(true);
		setPendingDrop(null);
	}, []);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setIsDragging(false);
			const { active, over } = event;
			if (!over) {
				return;
			}

			const overId = String(over.id);
			if (!overId.startsWith("drop-")) {
				return;
			}

			const cardId = String(active.id);
			const coordStr = overId.slice(5);
			const [xs, ys] = coordStr.split(",");
			const x = Number(xs);
			const y = Number(ys);

			const rotations = placementsByPos.get(coordStr);
			if (!rotations || rotations.length === 0) {
				return;
			}

			const cardRot = cardRotations[cardId] ?? 0;
			if (rotations.includes(cardRot)) {
				doPlaceTile(cardId, x, y, cardRot);
			} else if (rotations.length === 1) {
				doPlaceTile(cardId, x, y, rotations[0]!);
			} else {
				setPendingDrop({ x, y });
			}
		},
		[placementsByPos, doPlaceTile, cardRotations],
	);

	const handleDragCancel = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Find the active card data for DragOverlay
	const activeCard = useMemo(() => {
		if (!state || !activeCardId) {
			return null;
		}
		return state.hand.find((c) => c.id === activeCardId) ?? null;
	}, [state, activeCardId]);

	// --- Property resolution handlers ---

	const handlePlayKnife = useCallback(
		(cardId: string) => {
			dismissCard(cardId);
			dispatch({ type: "playKnife", cardId });
			setActiveCardId(null);
			setCardRotations((prev) => {
				const { [cardId]: _, ...rest } = prev;
				return rest;
			});
		},
		[dispatch, dismissCard],
	);

	const handleDigDiscard = useCallback(
		(cardId: string) => {
			dispatch({ type: "digDiscard", cardId });
		},
		[dispatch],
	);

	const handlePeekReturn = useCallback(
		(cardId: string) => {
			dispatch({ type: "peekReturn", cardId });
		},
		[dispatch],
	);

	const handleHatchTarget = useCallback(
		(targetPlayerId: string) => {
			dispatch({ type: "hatchTarget", targetPlayerId });
		},
		[dispatch],
	);

	const handleSwapPickPlayer = useCallback(
		(targetPlayerId: string) => {
			dispatch({ type: "swapPickPlayer", targetPlayerId });
		},
		[dispatch],
	);

	const handleSwapTakeCard = useCallback(
		(cardId: string | null) => {
			dispatch({ type: "swapTakeCard", cardId });
		},
		[dispatch],
	);

	const handleSwapGiveCard = useCallback(
		(cardId: string) => {
			dispatch({ type: "swapGiveCard", cardId });
		},
		[dispatch],
	);

	const handleCutSegment = useCallback(
		(x: number, y: number, direction: string) => {
			dispatch({ type: "cutSegment", x, y, direction });
		},
		[dispatch],
	);

	// Debug: log every state update to catch "no valid moves" bug
	useEffect(() => {
		if (!state) {
			return;
		}
		if (state.isMyTurn && state.phase === "playing") {
			const validCount = Object.keys(state.validPlacements).length;
			const knivesCount = state.playableKnives.length;
			console.log(
				`[tapeworm-client] My turn: validPlacements=${validCount}, knives=${knivesCount}, hand=${state.hand.length}, deckSize=${state.deckSize}, cardsPlayed=${state.cardsPlayedThisTurn}, chainColor=${state.chainColor}`,
			);
			if (validCount === 0 && knivesCount === 0) {
				console.warn("[tapeworm-client] NO MOVES! Full state:", JSON.stringify(state, null, 2));
			}
		}
	}, [state]);

	if (!state) {
		return <p className="status-text">Загрузка игры...</p>;
	}

	if (state.phase === "gameOver") {
		return (
			<div className="tapeworm">
				<GameOver
					players={state.players}
					winnerId={state.winnerId}
					isHost={isHost}
					onReturnToLobby={() => send({ type: "returnToLobby" })}
				/>
			</div>
		);
	}

	const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);
	const canPlay =
		state.isMyTurn &&
		(Object.keys(state.validPlacements).length > 0 || state.playableKnives.length > 0);
	const canEndTurn = state.isMyTurn && state.phase === "playing";

	// Discard mode: ringworm triggered
	const isDiscarding = state.phase === "discarding" && state.pendingDiscard?.playerId === playerId;
	const discardCount = state.pendingDiscard?.count ?? 0;
	const canConfirmDiscard = isDiscarding && discardSelection.length === discardCount;

	// Property resolution modes
	const pending = state.pendingProperty;
	const isMyProperty = pending?.playerId === playerId;

	const isDigging = state.phase === "digging" && isMyProperty;
	const isPeeking = state.phase === "peeking" && isMyProperty;
	const isHatching = state.phase === "hatching" && isMyProperty;
	const isSwapping = state.phase === "swapping" && isMyProperty;
	const isCutting = state.phase === "cutting" && isMyProperty;

	// During property resolution phases, we disable normal board/hand interaction
	const isPropertyPhase = isDigging || isPeeking || isHatching || isSwapping || isCutting;

	// Check if selected card is a knife
	const selectedCardIsKnife =
		activeCardId && state.hand.find((c) => c.id === activeCardId)?.card.type === "knife";

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={pointerWithin}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
			onDragCancel={handleDragCancel}
		>
			<div className="tapeworm">
				<TableSeating
					players={state.players}
					currentPlayerId={state.currentPlayerId}
					myPlayerId={playerId}
					hostId={room?.hostId ?? null}
				>
					{/* CUT phase: show board with cut targets */}
					{isCutting && state.validCutTargets ? (
						<CutOverlay
							board={state.board}
							validCutTargets={state.validCutTargets}
							onCut={handleCutSegment}
						/>
					) : (
						<Board
							board={state.board}
							validPlacements={isDiscarding || isPropertyPhase ? [] : activePlacements}
							activeCardId={isDiscarding || isPropertyPhase ? null : activeCardId}
							isDragging={isDragging}
							dragRotation={activeRotation}
							activeCard={activeCard?.card ?? null}
							onPlaceTile={handlePlaceTile}
						/>
					)}
				</TableSeating>

				{/* SWAP: decideExchange — show target's hand */}
				{isSwapping && pending?.swapStep === "decideExchange" && state.swapTargetHand && (
					<SwapDecidePanel
						targetHand={state.swapTargetHand}
						targetName={
							state.players.find((p) => p.id === pending.swapTargetPlayerId)?.name ?? "..."
						}
						onTake={handleSwapTakeCard}
						onSkip={() => handleSwapTakeCard(null)}
					/>
				)}

				{/* SWAP: giveCard — show own hand for picking */}
				{isSwapping && pending?.swapStep === "giveCard" && (
					<PropertyHandPicker
						cards={state.hand}
						instruction="Отдайте карту в обмен"
						onPick={handleSwapGiveCard}
					/>
				)}

				{/* DIG: pick card to discard */}
				{isDigging && (
					<PropertyHandPicker
						cards={state.hand}
						instruction={`Сбросьте карту${pending && pending.remainingActivations > 1 ? ` (осталось ${pending.remainingActivations})` : ""}`}
						onPick={handleDigDiscard}
					/>
				)}

				{/* PEEK: pick card to put on deck */}
				{isPeeking && (
					<PropertyHandPicker
						cards={state.hand}
						instruction={`Верните карту на верх колоды${pending && pending.remainingActivations > 1 ? ` (осталось ${pending.remainingActivations})` : ""}`}
						onPick={handlePeekReturn}
					/>
				)}

				{/* HATCH: pick target player */}
				{isHatching && (
					<PlayerPicker
						players={state.players}
						myPlayerId={playerId}
						instruction={`Заставьте игрока взять карту${pending && pending.remainingActivations > 1 ? ` (осталось ${pending.remainingActivations})` : ""}`}
						onPick={handleHatchTarget}
					/>
				)}

				{/* SWAP: pickPlayer */}
				{isSwapping && pending?.swapStep === "pickPlayer" && (
					<PlayerPicker
						players={state.players}
						myPlayerId={playerId}
						instruction={`Выберите игрока для обмена${pending.remainingActivations > 1 ? ` (осталось ${pending.remainingActivations})` : ""}`}
						onPick={handleSwapPickPlayer}
					/>
				)}

				<StatusBar
					state={state}
					playerId={playerId}
					isDiscarding={isDiscarding}
					discardCount={discardCount}
					currentPlayer={currentPlayer}
					canPlay={canPlay}
					canEndTurn={canEndTurn}
					onEndTurn={handleEndTurn}
				/>

				{/* Normal hand — hidden during certain property phases */}
				{!isDigging && !isPeeking && !(isSwapping && pending?.swapStep === "giveCard") && (
					<Hand
						cards={state.hand}
						selectedCardId={isDiscarding || isPropertyPhase ? null : activeCardId}
						cardRotations={cardRotations}
						onSelectCard={
							isDiscarding
								? (id) => {
										if (id) {
											toggleDiscardCard(id);
										}
									}
								: (id) => {
										if (isPropertyPhase) {
											return;
										}
										setActiveCardId(id);
										setPendingDrop(null);
									}
						}
						onRotate={() => setActiveRotation((r) => cycleRotation(r))}
						disabled={isDiscarding ? false : !state.isMyTurn || isPropertyPhase}
						discardMode={isDiscarding}
						discardSelection={discardSelection}
						deckSize={state.deckSize}
						phase={state.phase}
						dismissedCardIds={dismissedCardIds}
					/>
				)}

				{/* Controls */}
				{isDiscarding ? (
					<div className="tapeworm-controls">
						<button
							className="btn btn-primary tapeworm-btn"
							onClick={handleDiscard}
							disabled={!canConfirmDiscard}
						>
							Сбросить ({discardSelection.length}/{discardCount})
						</button>
					</div>
				) : selectedCardIsKnife && activeCardId && state.playableKnives.includes(activeCardId) ? (
					<div className="tapeworm-controls">
						<button
							className="btn btn-primary tapeworm-btn"
							onClick={() => handlePlayKnife(activeCardId)}
						>
							Разрезать
						</button>
						{canEndTurn && (
							<button className="btn btn-secondary tapeworm-btn" onClick={handleEndTurn}>
								{state.cardsPlayedThisTurn > 0 ? "Завершить ход" : "Пас"}
							</button>
						)}
					</div>
				) : (
					canEndTurn &&
					!isPropertyPhase && (
						<div className="tapeworm-controls">
							<button className="btn btn-secondary tapeworm-btn" onClick={handleEndTurn}>
								{state.cardsPlayedThisTurn > 0 ? "Завершить ход" : "Пас"}
							</button>
						</div>
					)
				)}
			</div>

			<DragOverlay dropAnimation={null}>
				{isDragging && activeCard && (
					<div className="tapeworm-drag-overlay">
						<CardView card={activeCard.card} size={64} rotation={activeRotation} />
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}

// --- Sub-components for property resolution ---

function StatusBar({
	state,
	playerId,
	isDiscarding,
	discardCount,
	currentPlayer,
	canPlay,
	canEndTurn,
	onEndTurn,
}: {
	state: TapewormPlayerView;
	playerId: string | null;
	isDiscarding: boolean;
	discardCount: number;
	currentPlayer: { name: string } | undefined;
	canPlay: boolean;
	canEndTurn: boolean;
	onEndTurn: () => void;
}) {
	const pending = state.pendingProperty;
	const isMyProperty = pending?.playerId === playerId;

	const propertyLabel = () => {
		if (!pending) {
			return null;
		}
		const who = isMyProperty
			? "Вы"
			: (state.players.find((p) => p.id === pending.playerId)?.name ?? "...");

		switch (pending.trait) {
			case "DIG":
				return isMyProperty ? "Выберите карту для сброса" : `${who} выбирает карту для сброса`;
			case "PEEK":
				return isMyProperty ? "Верните карту на верх колоды" : `${who} возвращает карту в колоду`;
			case "HATCH":
				return isMyProperty ? "Выберите игрока" : `${who} выбирает игрока`;
			case "SWAP":
				if (pending.swapStep === "pickPlayer") {
					return isMyProperty ? "Выберите игрока для обмена" : `${who} выбирает игрока`;
				}
				if (pending.swapStep === "decideExchange") {
					return isMyProperty ? "Выберите карту для обмена или пропустите" : `${who} смотрит руку`;
				}
				if (pending.swapStep === "giveCard") {
					return isMyProperty ? "Отдайте карту" : `${who} отдаёт карту`;
				}
				return null;
			case "CUT":
				return isMyProperty ? "Выберите сегмент для разрезания" : `${who} разрезает червяка`;
			default:
				return null;
		}
	};

	let statusText: string;

	if (isDiscarding) {
		statusText = `Ringworm! Выберите ${discardCount} карт${discardCount === 1 ? "у" : "ы"} для сброса`;
	} else if (pending && state.phase !== "playing") {
		statusText = propertyLabel() ?? "";
	} else if (state.isMyTurn) {
		if (state.cardsPlayedThisTurn > 0) {
			const colorName = state.chainColor ? (COLOR_NAMES[state.chainColor] ?? state.chainColor) : "";
			statusText = `Ваш ход · выложите ещё карту${colorName ? ` (${colorName})` : ""} или завершите ход`;
		} else if (canPlay) {
			statusText = "Ваш ход · выберите карту";
		} else {
			statusText = "Ваш ход · нет доступных ходов";
		}
	} else if (state.phase === "discarding") {
		const discardPlayer = state.players.find((p) => p.id === state.pendingDiscard?.playerId);
		statusText = `${discardPlayer?.name ?? "..."} выбирает карты для сброса`;
	} else {
		statusText = `Ходит ${currentPlayer?.name ?? "..."}`;
	}

	// Show pass button inline when player has no moves
	const showInlinePass = canEndTurn && !canPlay && !isDiscarding && state.phase === "playing";

	return (
		<div className="tapeworm-status">
			<span>{statusText}</span>
			{showInlinePass ? (
				<button className="btn btn-secondary tapeworm-status-pass-btn" onClick={onEndTurn}>
					{state.cardsPlayedThisTurn > 0 ? "Завершить" : "Пас"}
				</button>
			) : (
				<span className="tapeworm-deck-count">
					В колоде <strong>{state.deckSize}</strong> {pluralCards(state.deckSize)}
				</span>
			)}
		</div>
	);
}

function PropertyHandPicker({
	cards,
	instruction,
	onPick,
}: {
	cards: HandCard[];
	instruction: string;
	onPick: (cardId: string) => void;
}) {
	return (
		<div className="tapeworm-property-panel">
			<div className="tapeworm-property-instruction">{instruction}</div>
			<div className="tapeworm-hand">
				{cards.map((hc) => (
					<div
						key={hc.id}
						className="tapeworm-hand-card tapeworm-hand-card--pickable"
						onClick={() => onPick(hc.id)}
					>
						<CardView card={hc.card} size={64} />
					</div>
				))}
			</div>
		</div>
	);
}

function PlayerPicker({
	players,
	myPlayerId,
	instruction,
	onPick,
}: {
	players: { id: string; name: string; avatarSeed: number }[];
	myPlayerId: string | null;
	instruction: string;
	onPick: (playerId: string) => void;
}) {
	const others = players.filter((p) => p.id !== myPlayerId);

	return (
		<div className="tapeworm-property-panel">
			<div className="tapeworm-property-instruction">{instruction}</div>
			<div className="tapeworm-player-picker">
				{others.map((p) => (
					<button
						key={p.id}
						className="btn btn-secondary tapeworm-player-pick-btn"
						onClick={() => onPick(p.id)}
					>
						{p.name}
					</button>
				))}
			</div>
		</div>
	);
}

function SwapDecidePanel({
	targetHand,
	targetName,
	onTake,
	onSkip,
}: {
	targetHand: HandCard[];
	targetName: string;
	onTake: (cardId: string) => void;
	onSkip: () => void;
}) {
	return (
		<div className="tapeworm-property-panel">
			<div className="tapeworm-property-instruction">
				Рука игрока {targetName} — выберите карту или пропустите
			</div>
			<div className="tapeworm-hand">
				{targetHand.map((hc) => (
					<div
						key={hc.id}
						className="tapeworm-hand-card tapeworm-hand-card--pickable"
						onClick={() => onTake(hc.id)}
					>
						<CardView card={hc.card} size={64} />
					</div>
				))}
			</div>
			<button className="btn btn-secondary tapeworm-btn" onClick={onSkip}>
				Пропустить
			</button>
		</div>
	);
}

function CutOverlay({
	board,
	validCutTargets,
	onCut,
}: {
	board: Record<string, import("@/shared/types/tapeworm").PlacedCard>;
	validCutTargets: import("@/shared/types/tapeworm").CutTarget[];
	onCut: (x: number, y: number, direction: string) => void;
}) {
	// Reuse board rendering but overlay cut targets as clickable markers

	const CELL_SIZE = 72;
	const GAP = 2;
	const CELL_STEP = CELL_SIZE + GAP;

	const allKeys = useMemo(() => {
		return Object.keys(board).map((key) => {
			const [xs, ys] = key.split(",");
			return { x: Number(xs), y: Number(ys) };
		});
	}, [board]);

	const bounds = useMemo(() => {
		if (allKeys.length === 0) {
			return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
		}
		let minX = Infinity,
			maxX = -Infinity,
			minY = Infinity,
			maxY = -Infinity;
		for (const { x, y } of allKeys) {
			if (x < minX) {
				minX = x;
			}
			if (x > maxX) {
				maxX = x;
			}
			if (y < minY) {
				minY = y;
			}
			if (y > maxY) {
				maxY = y;
			}
		}
		return { minX: minX - 1, maxX: maxX + 1, minY: minY - 1, maxY: maxY + 1 };
	}, [allKeys]);

	const boardWidth = (bounds.maxX - bounds.minX + 1) * CELL_STEP;
	const boardHeight = (bounds.maxY - bounds.minY + 1) * CELL_STEP;

	// Position cut target markers at the edge between two cells
	const DIRECTION_OFFSETS: Record<string, { dx: number; dy: number }> = {
		top: { dx: 0, dy: -0.5 },
		right: { dx: 0.5, dy: 0 },
		bottom: { dx: 0, dy: 0.5 },
		left: { dx: -0.5, dy: 0 },
	};

	return (
		<div className="tapeworm-board-container">
			<div
				className="tapeworm-board"
				style={{
					width: boardWidth,
					height: boardHeight,
					position: "relative",
				}}
			>
				{/* Placed cards (dimmed) */}
				{Object.entries(board).map(([key, placed]) => {
					const [xs, ys] = key.split(",");
					const x = Number(xs);
					const y = Number(ys);
					const left = (x - bounds.minX) * CELL_STEP;
					const top = (y - bounds.minY) * CELL_STEP;
					return (
						<div
							key={key}
							className="tapeworm-cell tapeworm-cell-card"
							style={{
								left,
								top,
								width: CELL_SIZE,
								height: CELL_SIZE,
								position: "absolute",
								opacity: 0.6,
							}}
						>
							<CardView card={placed.card} rotation={placed.rotation} size={CELL_SIZE} />
						</div>
					);
				})}

				{/* Cut target markers */}
				{validCutTargets.map((ct) => {
					const offsets = DIRECTION_OFFSETS[ct.direction]!;
					const cx = ct.x + offsets.dx;
					const cy = ct.y + offsets.dy;
					const left = (cx - bounds.minX) * CELL_STEP + CELL_SIZE / 2 - 14;
					const top = (cy - bounds.minY) * CELL_STEP + CELL_SIZE / 2 - 14;
					return (
						<button
							key={`cut-${ct.x}-${ct.y}-${ct.direction}`}
							className="tapeworm-cut-target"
							style={{
								left,
								top,
								position: "absolute",
							}}
							onClick={() => onCut(ct.x, ct.y, ct.direction)}
							title={`Разрезать (${ct.color})`}
						>
							✂️
						</button>
					);
				})}
			</div>
		</div>
	);
}
