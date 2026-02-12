import { useDraggable } from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HandCard, Rotation, TapewormPhase } from "@/shared/types/tapeworm";
import { CardPopover } from "./CardPopover";
import { CardView } from "./CardView";
import { type DepartingCard, useCardAnimations } from "./useCardAnimations";

const LONG_PRESS_MS = 400;

interface HandProps {
	cards: HandCard[];
	selectedCardId: string | null;
	cardRotations: Record<string, Rotation>;
	onSelectCard: (cardId: string | null) => void;
	onRotate: () => void;
	disabled: boolean;
	discardMode?: boolean;
	discardSelection?: string[];
	deckSize: number;
	phase: TapewormPhase;
	dismissedCardIds: Set<string>;
}

function DraggableCard({
	hc,
	isSelected,
	isEntering,
	disabled,
	dragRotation,
	isDiscardSelected,
	discardMode,
	onSelect,
	onRotate,
	onLongPress,
}: {
	hc: HandCard;
	isSelected: boolean;
	isEntering: boolean;
	disabled: boolean;
	dragRotation: Rotation;
	isDiscardSelected: boolean;
	discardMode: boolean;
	onSelect: () => void;
	onRotate: () => void;
	onLongPress: (card: HandCard) => void;
}) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: hc.id,
		disabled: disabled || discardMode,
	});

	// Animate rotation transitions smoothly via Web Animations API.
	// The final orientation is handled by CardView's `rotation` prop (SVG internal),
	// so we only animate the 90° step transition (no fill: forwards).
	const innerRef = useRef<HTMLDivElement>(null);
	const prevRotation = useRef<Rotation>(dragRotation);
	useEffect(() => {
		if (dragRotation !== prevRotation.current) {
			const diff = (dragRotation - prevRotation.current + 360) % 360 || 360;
			prevRotation.current = dragRotation;
			const el = innerRef.current;
			if (el) {
				el.animate([{ transform: `rotate(-${diff}deg)` }, { transform: "rotate(0deg)" }], {
					duration: 200,
					easing: "ease-out",
				});
			}
		}
	}, [dragRotation]);

	const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const didLongPress = useRef(false);

	const clearTimer = useCallback(() => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	}, []);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			didLongPress.current = false;
			longPressTimer.current = setTimeout(() => {
				didLongPress.current = true;
				onLongPress(hc);
			}, LONG_PRESS_MS);
			listeners?.onPointerDown?.(e as never);
		},
		[hc, onLongPress, listeners],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			clearTimer();
			listeners?.onPointerMove?.(e as never);
		},
		[clearTimer, listeners],
	);

	const handlePointerUp = useCallback(() => {
		clearTimer();
	}, [clearTimer]);

	const handleClick = useCallback(() => {
		if (didLongPress.current) {
			didLongPress.current = false;
			return;
		}
		onSelect();
	}, [onSelect]);

	const classes = [
		"tapeworm-hand-card",
		isSelected && "tapeworm-hand-card--selected",
		isEntering && "tapeworm-hand-card--entering",
		disabled && !discardMode && "tapeworm-hand-card--disabled",
		isDragging && "tapeworm-hand-card--dragging",
		isDiscardSelected && "tapeworm-hand-card--discard",
	]
		.filter(Boolean)
		.join(" ");

	const { onPointerDown: _, onPointerMove: __, ...restListeners } = listeners ?? {};

	return (
		<div
			ref={setNodeRef}
			className={classes}
			onClick={handleClick}
			onPointerDown={discardMode ? undefined : handlePointerDown}
			onPointerMove={discardMode ? undefined : handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			{...(discardMode ? {} : { ...restListeners, ...attributes })}
		>
			<div ref={innerRef} className="tapeworm-hand-card-inner">
				<CardView card={hc.card} size={64} rotation={dragRotation} />
			</div>
			{isSelected && !isDragging && !discardMode && (
				<button
					className="tapeworm-rotate-btn"
					onClick={(e) => {
						e.stopPropagation();
						onRotate();
					}}
					onPointerDown={(e) => e.stopPropagation()}
				>
					↻
				</button>
			)}
		</div>
	);
}

function DepartingCardView({
	departing,
	onComplete,
}: {
	departing: DepartingCard;
	onComplete: () => void;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) {
			return;
		}
		const handler = () => onComplete();
		el.addEventListener("animationend", handler);
		// Fallback timeout in case animationend doesn't fire
		const timer = setTimeout(onComplete, 400);
		return () => {
			el.removeEventListener("animationend", handler);
			clearTimeout(timer);
		};
	}, [onComplete]);

	const animClass =
		departing.animation === "return-to-deck"
			? "tapeworm-hand-card--return-exit"
			: "tapeworm-hand-card--discard-exit";

	return (
		<div ref={ref} className={`tapeworm-hand-card ${animClass}`}>
			<div className="tapeworm-hand-card-inner">
				<CardView card={departing.handCard.card} size={64} />
			</div>
		</div>
	);
}

export function Hand({
	cards,
	selectedCardId,
	cardRotations,
	onSelectCard,
	onRotate,
	disabled,
	discardMode = false,
	discardSelection = [],
	deckSize,
	phase,
	dismissedCardIds,
}: HandProps) {
	const [popoverCard, setPopoverCard] = useState<HandCard | null>(null);

	const { departingCards, enteringCardIds, onDepartComplete } = useCardAnimations(
		cards,
		deckSize,
		phase,
		dismissedCardIds,
	);

	return (
		<>
			<div className="tapeworm-hand">
				{cards.map((hc) => {
					const isSelected = selectedCardId === hc.id;
					const isDiscardSelected = discardSelection.includes(hc.id);
					const isEntering = enteringCardIds.has(hc.id);
					return (
						<DraggableCard
							key={hc.id}
							hc={hc}
							isSelected={isSelected}
							isEntering={isEntering}
							disabled={disabled}
							dragRotation={cardRotations[hc.id] ?? 0}
							isDiscardSelected={isDiscardSelected}
							discardMode={discardMode}
							onSelect={() => {
								if (discardMode) {
									onSelectCard(hc.id);
									return;
								}
								if (disabled) {
									return;
								}
								onSelectCard(isSelected ? null : hc.id);
							}}
							onRotate={onRotate}
							onLongPress={setPopoverCard}
						/>
					);
				})}

				{departingCards.map((d) => (
					<DepartingCardView key={d.key} departing={d} onComplete={() => onDepartComplete(d.key)} />
				))}
			</div>

			{popoverCard && <CardPopover card={popoverCard} onClose={() => setPopoverCard(null)} />}
		</>
	);
}
