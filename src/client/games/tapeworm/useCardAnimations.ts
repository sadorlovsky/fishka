import { useCallback, useEffect, useRef, useState } from "react";
import type { HandCard, TapewormPhase } from "@/shared/types/tapeworm";

export type CardAnimation = "draw-from-deck" | "discard" | "return-to-deck";

export interface DepartingCard {
	handCard: HandCard;
	animation: "discard" | "return-to-deck";
	key: string;
}

/**
 * Diffs hand state between renders to detect card movements
 * and produce entrance/exit animation data.
 *
 * - New card IDs in hand → entrance animation ("draw-from-deck")
 * - Missing card IDs from hand → exit animation ("discard" or "return-to-deck")
 * - Cards removed by user action (placeTile, playKnife) are excluded via `dismissedCardIds`
 */
export function useCardAnimations(
	hand: HandCard[],
	deckSize: number,
	phase: TapewormPhase,
	dismissedCardIds: Set<string>,
) {
	const prevHandRef = useRef<HandCard[] | null>(null);
	const prevDeckSizeRef = useRef<number>(deckSize);
	const prevPhaseRef = useRef<TapewormPhase>(phase);
	// Read dismissedCardIds via ref to avoid it triggering the effect
	const dismissedRef = useRef(dismissedCardIds);
	dismissedRef.current = dismissedCardIds;

	const [departingCards, setDepartingCards] = useState<DepartingCard[]>([]);
	const [enteringCardIds, setEnteringCardIds] = useState<Set<string>>(new Set());

	// Monotonic counter for unique departing card keys
	const keyCounter = useRef(0);

	// Only depend on hand/deckSize/phase — NOT dismissedCardIds
	useEffect(() => {
		const prevHand = prevHandRef.current;
		const prevDeckSize = prevDeckSizeRef.current;
		const prevPhase = prevPhaseRef.current;

		// Update refs for next render
		prevHandRef.current = hand;
		prevDeckSizeRef.current = deckSize;
		prevPhaseRef.current = phase;

		// Skip on first render — no previous state to diff
		if (prevHand === null) {
			return;
		}

		// Skip animations on game over
		if (phase === "gameOver") {
			return;
		}

		const prevIds = new Set(prevHand.map((c) => c.id));
		const currIds = new Set(hand.map((c) => c.id));

		// --- Entering cards (new in hand) ---
		const newIds: string[] = [];
		for (const id of currIds) {
			if (!prevIds.has(id)) {
				newIds.push(id);
			}
		}

		if (newIds.length > 0) {
			setEnteringCardIds(new Set(newIds));
			// Clear entering state after glow animation completes
			setTimeout(() => {
				setEnteringCardIds((prev) => {
					const next = new Set(prev);
					for (const id of newIds) {
						next.delete(id);
					}
					return next;
				});
			}, 800);
		}

		// --- Departing cards (removed from hand) ---
		const dismissed = dismissedRef.current;
		const removedCards: HandCard[] = [];
		for (const c of prevHand) {
			if (!currIds.has(c.id) && !dismissed.has(c.id)) {
				removedCards.push(c);
			}
		}

		if (removedCards.length > 0) {
			// Determine animation type from context
			let animation: "discard" | "return-to-deck";
			if (prevPhase === "peeking" || (phase === "playing" && deckSize > prevDeckSize)) {
				animation = "return-to-deck";
			} else {
				animation = "discard";
			}

			const newDeparting: DepartingCard[] = removedCards.map((c) => ({
				handCard: c,
				animation,
				key: `depart-${keyCounter.current++}`,
			}));

			setDepartingCards((prev) => [...prev, ...newDeparting]);
		}
	}, [hand, deckSize, phase]);

	const onDepartComplete = useCallback((key: string) => {
		setDepartingCards((prev) => prev.filter((d) => d.key !== key));
	}, []);

	return { departingCards, enteringCardIds, onDepartComplete };
}
