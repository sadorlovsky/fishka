import type {
	CardDefinition,
	CardPath,
	CutTarget,
	Direction,
	KnifeColor,
	PlacedCard,
	Rotation,
	ValidPlacement,
	WormColor,
} from "@/shared/types/tapeworm";

// --- Direction helpers ---

const DIRECTIONS: Direction[] = ["top", "right", "bottom", "left"];

const OPPOSITE: Record<Direction, Direction> = {
	top: "bottom",
	right: "left",
	bottom: "top",
	left: "right",
};

const ROTATION_MAP: Record<Direction, Direction> = {
	top: "right",
	right: "bottom",
	bottom: "left",
	left: "top",
};

export function getOppositeDirection(dir: Direction): Direction {
	return OPPOSITE[dir];
}

export function getNeighborKey(x: number, y: number, dir: Direction): string {
	switch (dir) {
		case "top":
			return `${x},${y - 1}`;
		case "right":
			return `${x + 1},${y}`;
		case "bottom":
			return `${x},${y + 1}`;
		case "left":
			return `${x - 1},${y}`;
	}
}

export function parseKey(key: string): { x: number; y: number } {
	const [xs, ys] = key.split(",");
	return { x: Number(xs), y: Number(ys) };
}

// --- Rotation ---

function rotateDirection(dir: Direction, rotation: Rotation): Direction {
	let d = dir;
	const steps = rotation / 90;
	for (let i = 0; i < steps; i++) {
		d = ROTATION_MAP[d];
	}
	return d;
}

export function rotatePaths(paths: CardPath[], rotation: Rotation): CardPath[] {
	if (rotation === 0) {
		return paths;
	}
	return paths.map((p) => ({
		...p,
		directions: p.directions.map((d) => rotateDirection(d, rotation)),
	}));
}

// --- Board queries ---

/** Get the color at a specific direction of a placed card */
export function getColorAtDirection(placed: PlacedCard, dir: Direction): WormColor | null {
	const rotated = rotatePaths(placed.card.paths, placed.rotation);
	for (const path of rotated) {
		if (path.directions.includes(dir)) {
			return path.color;
		}
	}
	return null;
}

export interface OpenEnd {
	x: number;
	y: number;
	direction: Direction;
	color: WormColor;
}

/** Find all open (unconnected) worm ends on the board */
export function getOpenEnds(board: Record<string, PlacedCard>): OpenEnd[] {
	const ends: OpenEnd[] = [];

	for (const [key, placed] of Object.entries(board)) {
		const { x, y } = parseKey(key);
		const rotated = rotatePaths(placed.card.paths, placed.rotation);

		for (const path of rotated) {
			for (const dir of path.directions) {
				const neighborKey = getNeighborKey(x, y, dir);
				const neighbor = board[neighborKey];
				if (!neighbor) {
					// This direction has no neighbor — it's an open end
					ends.push({ x, y, direction: dir, color: path.color });
				}
			}
		}
	}

	return ends;
}

/** Check if a card placement is valid */
export function isValidPlacement(
	board: Record<string, PlacedCard>,
	card: CardDefinition,
	x: number,
	y: number,
	rotation: Rotation,
): boolean {
	const key = `${x},${y}`;

	// Cell must be empty
	if (board[key]) {
		return false;
	}

	const rotated = rotatePaths(card.paths, rotation);

	// Gather all directions this card has connections to
	const cardDirections = new Set<Direction>();
	for (const path of rotated) {
		for (const dir of path.directions) {
			cardDirections.add(dir);
		}
	}

	let hasAdjacentCard = false;
	let connectsToOpenEnd = false;

	for (const dir of DIRECTIONS) {
		const neighborKey = getNeighborKey(x, y, dir);
		const neighbor = board[neighborKey];
		const cardHasDir = cardDirections.has(dir);

		if (!neighbor) {
			// No neighbor on this side — fine regardless
			continue;
		}

		hasAdjacentCard = true;
		const neighborColor = getColorAtDirection(neighbor, OPPOSITE[dir]);
		const neighborHasConnection = neighborColor !== null;

		if (cardHasDir && neighborHasConnection) {
			// Both have connections — colors must match
			const cardColor = rotated.find((p) => p.directions.includes(dir))!.color;
			if (cardColor !== neighborColor) {
				return false;
			}
			connectsToOpenEnd = true;
		} else if (cardHasDir && !neighborHasConnection) {
			// Card has a connection but neighbor doesn't — invalid (worm goes into a wall)
			return false;
		} else if (!cardHasDir && neighborHasConnection) {
			// Neighbor has a connection but card doesn't — invalid (blocks neighbor's worm)
			return false;
		}
		// Neither has connection on this side — fine
	}

	// Must be adjacent to at least one existing card
	if (!hasAdjacentCard) {
		return false;
	}

	// Must connect to at least one open end
	if (!connectsToOpenEnd) {
		return false;
	}

	return true;
}

/** Get all valid placements for a card on the board */
export function getValidPlacements(
	board: Record<string, PlacedCard>,
	card: CardDefinition,
): ValidPlacement[] {
	const placements: ValidPlacement[] = [];

	// Candidate cells: empty neighbors of existing cards
	const candidates = new Set<string>();
	for (const key of Object.keys(board)) {
		const { x, y } = parseKey(key);
		for (const dir of DIRECTIONS) {
			const neighborKey = getNeighborKey(x, y, dir);
			if (!board[neighborKey]) {
				candidates.add(neighborKey);
			}
		}
	}

	const rotations: Rotation[] = [0, 90, 180, 270];

	for (const candidateKey of candidates) {
		const { x, y } = parseKey(candidateKey);
		for (const rotation of rotations) {
			if (isValidPlacement(board, card, x, y, rotation)) {
				placements.push({ x, y, rotation });
			}
		}
	}

	return placements;
}

/**
 * Detect if placing a card creates a ringworm (closed loop).
 * A loop is formed when a path on the newly placed card connects to 2+ existing
 * neighbors of the same color — meaning two previously-open ends met.
 */
export function detectRingworm(
	board: Record<string, PlacedCard>,
	card: CardDefinition,
	x: number,
	y: number,
	rotation: Rotation,
): boolean {
	const rotated = rotatePaths(card.paths, rotation);

	for (const path of rotated) {
		let connections = 0;
		for (const dir of path.directions) {
			const neighborKey = getNeighborKey(x, y, dir);
			const neighbor = board[neighborKey];
			if (!neighbor) {
				continue;
			}
			const neighborColor = getColorAtDirection(neighbor, OPPOSITE[dir]);
			if (neighborColor === path.color) {
				connections++;
			}
		}
		// A path connecting to 2+ neighbors means it closed a loop
		if (connections >= 2) {
			return true;
		}
	}

	return false;
}

/** Check if placing a card continues the current chain color */
export function isChainPlacement(
	board: Record<string, PlacedCard>,
	lastPosition: { x: number; y: number },
	chainColor: WormColor,
	card: CardDefinition,
	x: number,
	y: number,
	rotation: Rotation,
): boolean {
	// The placed card must be adjacent to the last placed position
	const lastKey = `${lastPosition.x},${lastPosition.y}`;
	const lastPlaced = board[lastKey];
	if (!lastPlaced) {
		return false;
	}

	// Check that the new card connects to the last placed card with the chain color
	const rotated = rotatePaths(card.paths, rotation);

	for (const dir of DIRECTIONS) {
		const neighborKey = getNeighborKey(x, y, dir);
		if (neighborKey === lastKey) {
			// This side faces the last placed card
			const newCardColor = rotated.find((p) => p.directions.includes(dir))?.color;
			if (newCardColor === chainColor) {
				return true;
			}
		}
	}

	return false;
}

// --- CUT mechanics ---

/**
 * Find all valid cut targets on the board for a given knife color.
 * A cut target is a connected edge between two placed cards where the color
 * matches the knife color. Rainbow matches any color.
 */
export function getValidCutTargets(
	board: Record<string, PlacedCard>,
	cutColor: KnifeColor,
): CutTarget[] {
	const targets: CutTarget[] = [];
	const seen = new Set<string>();

	for (const [key, placed] of Object.entries(board)) {
		const { x, y } = parseKey(key);
		const rotated = rotatePaths(placed.card.paths, placed.rotation);

		for (const path of rotated) {
			if (cutColor !== "rainbow" && path.color !== cutColor) {
				continue;
			}

			for (const dir of path.directions) {
				const neighborKey = getNeighborKey(x, y, dir);
				const neighbor = board[neighborKey];
				if (!neighbor) {
					continue;
				}

				const neighborColor = getColorAtDirection(neighbor, OPPOSITE[dir]);
				if (neighborColor !== path.color) {
					continue;
				}

				// Deduplicate: each edge represented once (lower key first)
				const edgeId = key < neighborKey ? `${key}|${dir}` : `${neighborKey}|${OPPOSITE[dir]}`;
				if (seen.has(edgeId)) {
					continue;
				}
				seen.add(edgeId);

				targets.push({ x, y, direction: dir, color: path.color });
			}
		}
	}

	return targets;
}

/**
 * Perform a cut on the board: sever the edge at (x,y)→direction,
 * then remove all cards disconnected from the start card at (0,0).
 * Returns the new board and the list of removed placed cards.
 */
export function performCut(
	board: Record<string, PlacedCard>,
	x: number,
	y: number,
	direction: Direction,
): { newBoard: Record<string, PlacedCard>; removedCards: PlacedCard[] } {
	const cutKey = `${x},${y}`;
	const cutNeighborKey = getNeighborKey(x, y, direction);

	// BFS from start card (0,0), following all connected paths except the severed edge
	const reachable = new Set<string>();
	const queue: string[] = ["0,0"];
	reachable.add("0,0");

	while (queue.length > 0) {
		const key = queue.shift()!;
		const placed = board[key];
		if (!placed) {
			continue;
		}

		const { x: cx, y: cy } = parseKey(key);
		const rotated = rotatePaths(placed.card.paths, placed.rotation);

		for (const path of rotated) {
			for (const dir of path.directions) {
				// Skip the severed edge (both directions)
				if (key === cutKey && dir === direction) {
					continue;
				}
				if (key === cutNeighborKey && dir === OPPOSITE[direction]) {
					continue;
				}

				const neighborKey = getNeighborKey(cx, cy, dir);
				if (board[neighborKey] && !reachable.has(neighborKey)) {
					// Verify the neighbor actually connects back
					const neighborColor = getColorAtDirection(board[neighborKey]!, OPPOSITE[dir]);
					if (neighborColor === path.color) {
						reachable.add(neighborKey);
						queue.push(neighborKey);
					}
				}
			}
		}
	}

	const newBoard: Record<string, PlacedCard> = {};
	const removedCards: PlacedCard[] = [];

	for (const [key, placed] of Object.entries(board)) {
		if (reachable.has(key)) {
			newBoard[key] = placed;
		} else {
			removedCards.push(placed);
		}
	}

	return { newBoard, removedCards };
}
