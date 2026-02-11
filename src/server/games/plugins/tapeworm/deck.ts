import type {
	CardDefinition,
	CardPath,
	CardProperty,
	CardType,
	HandCard,
	KnifeColor,
	WormColor,
} from "@/shared/types/tapeworm";

// --- Helpers ---

function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j]!, result[i]!];
	}
	return result;
}

const DIG: CardProperty = { trait: "DIG", multiplier: 1 };
const DIG2: CardProperty = { trait: "DIG", multiplier: 2 };
const SWAP: CardProperty = { trait: "SWAP", multiplier: 1 };
const SWAP2: CardProperty = { trait: "SWAP", multiplier: 2 };
const HATCH: CardProperty = { trait: "HATCH", multiplier: 1 };
const HATCH2: CardProperty = { trait: "HATCH", multiplier: 2 };
const PEEK: CardProperty = { trait: "PEEK", multiplier: 1 };
const CUT: CardProperty = { trait: "CUT", multiplier: 1 };
const START: CardProperty = { trait: "START", multiplier: 1 };

// --- Card builder helpers ---

interface DeckCardEntry {
	type: CardType;
	paths: CardPath[];
	property?: CardProperty;
	knifeColor?: KnifeColor;
	isStartCard?: boolean;
}

function head(color: WormColor, property: CardProperty): DeckCardEntry {
	return { type: "head", paths: [{ directions: ["bottom"], color }], property };
}

function corner(color: WormColor, property?: CardProperty): DeckCardEntry {
	return {
		type: "corner",
		paths: [{ directions: ["bottom", "right"], color }],
		...(property && { property }),
	};
}

function straight(color: WormColor, property?: CardProperty): DeckCardEntry {
	return {
		type: "straight",
		paths: [{ directions: ["top", "bottom"], color }],
		...(property && { property }),
	};
}

function knife(color: KnifeColor): DeckCardEntry {
	return { type: "knife", paths: [], property: CUT, knifeColor: color };
}

// --- Static deck definition ---
// Each entry is a unique card as described in Cards.md

export const DECK_DEFINITION: DeckCardEntry[] = [
	// =============================================
	// HEADS (12) — all have HATCH, black has HATCHx2
	// =============================================
	head("black", HATCH2),
	head("black", HATCH2),
	head("black", HATCH2),
	head("white", HATCH),
	head("white", HATCH),
	head("white", HATCH),
	head("red", HATCH),
	head("red", HATCH),
	head("red", HATCH),
	head("pink", HATCH),
	head("pink", HATCH),
	head("pink", HATCH),

	// =============================================
	// SINGLE-COLOR CORNERS S→E (15) — no properties
	// =============================================
	corner("black"),
	corner("black"),
	corner("black"),
	corner("pink"),
	corner("pink"),
	corner("pink"),
	corner("pink"),
	corner("red"),
	corner("red"),
	corner("red"),
	corner("red"),
	corner("white"),
	corner("white"),
	corner("white"),
	corner("white"),

	// =============================================
	// SINGLE-COLOR STRAIGHTS (15)
	// 1 of 4 non-black has DIG, 1 of 3 black has DIGx2
	// =============================================
	straight("red"),
	straight("red"),
	straight("red"),
	straight("red", DIG),
	straight("pink"),
	straight("pink"),
	straight("pink"),
	straight("pink", DIG),
	straight("white"),
	straight("white"),
	straight("white"),
	straight("white", DIG),
	straight("black"),
	straight("black"),
	straight("black", DIG2),

	// =============================================
	// COLOR-TRANSITION STRAIGHTS W→E (3) — all PEEK
	// =============================================
	// red → pink (left=red, right=pink)
	{
		type: "straight",
		paths: [
			{ directions: ["left"], color: "red" },
			{ directions: ["right"], color: "pink" },
		],
		property: PEEK,
	},
	// red → white
	{
		type: "straight",
		paths: [
			{ directions: ["left"], color: "red" },
			{ directions: ["right"], color: "white" },
		],
		property: PEEK,
	},
	// white → pink
	{
		type: "straight",
		paths: [
			{ directions: ["left"], color: "white" },
			{ directions: ["right"], color: "pink" },
		],
		property: PEEK,
	},

	// =============================================
	// COLOR-TRANSITION STRAIGHTS N→S (3) — no properties
	// =============================================
	// pink → white (top=pink, bottom=white)
	{
		type: "straight",
		paths: [
			{ directions: ["top"], color: "pink" },
			{ directions: ["bottom"], color: "white" },
		],
	},
	// red → white
	{
		type: "straight",
		paths: [
			{ directions: ["top"], color: "red" },
			{ directions: ["bottom"], color: "white" },
		],
	},
	// white → red
	{
		type: "straight",
		paths: [
			{ directions: ["top"], color: "white" },
			{ directions: ["bottom"], color: "red" },
		],
	},

	// =============================================
	// COLOR-TRANSITION CORNERS W→S (3) — all PEEK
	// "↴" = west → south, i.e. left=color1, bottom=color2
	// =============================================
	// pink → white
	{
		type: "corner",
		paths: [
			{ directions: ["left"], color: "pink" },
			{ directions: ["bottom"], color: "white" },
		],
		property: PEEK,
	},
	// red → pink
	{
		type: "corner",
		paths: [
			{ directions: ["left"], color: "red" },
			{ directions: ["bottom"], color: "pink" },
		],
		property: PEEK,
	},
	// red → white
	{
		type: "corner",
		paths: [
			{ directions: ["left"], color: "red" },
			{ directions: ["bottom"], color: "white" },
		],
		property: PEEK,
	},

	// =============================================
	// COLOR-TRANSITION CORNERS S→E (10)
	// "↱" = south → east, i.e. bottom=color1, right=color2
	// =============================================
	// white → pink (no property)
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "white" },
			{ directions: ["right"], color: "pink" },
		],
	},
	// white → red (no property)
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "white" },
			{ directions: ["right"], color: "red" },
		],
	},
	// pink → red (no property)
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "pink" },
			{ directions: ["right"], color: "red" },
		],
	},
	// pink → white (DIG)
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "pink" },
			{ directions: ["right"], color: "white" },
		],
		property: DIG,
	},
	// white → red (DIG)
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "white" },
			{ directions: ["right"], color: "red" },
		],
		property: DIG,
	},
	// red → pink (DIG)
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "red" },
			{ directions: ["right"], color: "pink" },
		],
		property: DIG,
	},
	// black → white (DIGx2) — 2 cards
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "black" },
			{ directions: ["right"], color: "white" },
		],
		property: DIG2,
	},
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "black" },
			{ directions: ["right"], color: "white" },
		],
		property: DIG2,
	},
	// black → red (DIGx2)
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "black" },
			{ directions: ["right"], color: "red" },
		],
		property: DIG2,
	},
	// black → pink (DIGx2)
	{
		type: "corner",
		paths: [
			{ directions: ["bottom"], color: "black" },
			{ directions: ["right"], color: "pink" },
		],
		property: DIG2,
	},

	// =============================================
	// T-JUNCTIONS FROM 2 COLORS (2) — all DIGx2
	// "↴ west→south + →east" = corner(left,bottom)=color1 + right=color2
	// =============================================
	// ↴black→black + →red
	{
		type: "t-junction",
		paths: [
			{ directions: ["left", "bottom"], color: "black" },
			{ directions: ["right"], color: "red" },
		],
		property: DIG2,
	},
	// ↴black→black + →pink
	{
		type: "t-junction",
		paths: [
			{ directions: ["left", "bottom"], color: "black" },
			{ directions: ["right"], color: "pink" },
		],
		property: DIG2,
	},

	// =============================================
	// T-JUNCTIONS FROM 3 COLORS (5)
	// "west→east + ↓south" = left=color1, right=color2, bottom=color3
	// All SWAP except the START card
	// =============================================
	// red→white + pink(south)
	{
		type: "t-junction",
		paths: [
			{ directions: ["left"], color: "red" },
			{ directions: ["right"], color: "white" },
			{ directions: ["bottom"], color: "pink" },
		],
		property: SWAP,
	},
	// red→pink + white(south)
	{
		type: "t-junction",
		paths: [
			{ directions: ["left"], color: "red" },
			{ directions: ["right"], color: "pink" },
			{ directions: ["bottom"], color: "white" },
		],
		property: SWAP,
	},
	// pink→white + red(south) — START card
	{
		type: "t-junction",
		paths: [
			{ directions: ["left"], color: "pink" },
			{ directions: ["right"], color: "white" },
			{ directions: ["bottom"], color: "red" },
		],
		property: START,
		isStartCard: true,
	},
	// pink→white + red(south) — SWAP (second copy)
	{
		type: "t-junction",
		paths: [
			{ directions: ["left"], color: "pink" },
			{ directions: ["right"], color: "white" },
			{ directions: ["bottom"], color: "red" },
		],
		property: SWAP,
	},
	// pink→red + white(south)
	{
		type: "t-junction",
		paths: [
			{ directions: ["left"], color: "pink" },
			{ directions: ["right"], color: "red" },
			{ directions: ["bottom"], color: "white" },
		],
		property: SWAP,
	},

	// =============================================
	// CROSSES FROM 3 COLORS (6) — all DIG
	// "↴ west→south one color + ↑north second + →east third"
	// = corner(left,bottom)=color1 + top=color2 + right=color3
	// =============================================
	// ↴pink→pink + ↑white + →red
	{
		type: "cross",
		paths: [
			{ directions: ["left", "bottom"], color: "pink" },
			{ directions: ["top"], color: "white" },
			{ directions: ["right"], color: "red" },
		],
		property: DIG,
	},
	// ↴red→red + ↑white + →pink
	{
		type: "cross",
		paths: [
			{ directions: ["left", "bottom"], color: "red" },
			{ directions: ["top"], color: "white" },
			{ directions: ["right"], color: "pink" },
		],
		property: DIG,
	},
	// ↴pink→pink + ↑red + →white
	{
		type: "cross",
		paths: [
			{ directions: ["left", "bottom"], color: "pink" },
			{ directions: ["top"], color: "red" },
			{ directions: ["right"], color: "white" },
		],
		property: DIG,
	},
	// ↴white→white + ↑red + →pink
	{
		type: "cross",
		paths: [
			{ directions: ["left", "bottom"], color: "white" },
			{ directions: ["top"], color: "red" },
			{ directions: ["right"], color: "pink" },
		],
		property: DIG,
	},
	// ↴red→red + ↑pink + →white
	{
		type: "cross",
		paths: [
			{ directions: ["left", "bottom"], color: "red" },
			{ directions: ["top"], color: "pink" },
			{ directions: ["right"], color: "white" },
		],
		property: DIG,
	},
	// ↴white→white + ↑pink + →red
	{
		type: "cross",
		paths: [
			{ directions: ["left", "bottom"], color: "white" },
			{ directions: ["top"], color: "pink" },
			{ directions: ["right"], color: "red" },
		],
		property: DIG,
	},

	// =============================================
	// CROSS FROM ALL 4 COLORS (1) — SWAPx2
	// Clockwise from north: red → black → white → pink
	// north=red, right=black, bottom=white, left=pink
	// =============================================
	{
		type: "cross",
		paths: [
			{ directions: ["top"], color: "red" },
			{ directions: ["right"], color: "black" },
			{ directions: ["bottom"], color: "white" },
			{ directions: ["left"], color: "pink" },
		],
		property: SWAP2,
	},

	// =============================================
	// KNIVES (5) — all CUT
	// =============================================
	knife("black"),
	knife("pink"),
	knife("red"),
	knife("white"),
	knife("rainbow"),
];

// --- Deck creation ---

export function createDeck(): { deck: HandCard[]; startCard: CardDefinition } {
	let startCard: CardDefinition | null = null;
	const gameCards: HandCard[] = [];

	for (let i = 0; i < DECK_DEFINITION.length; i++) {
		const entry = DECK_DEFINITION[i]!;
		const cardDef: CardDefinition = {
			type: entry.type,
			paths: entry.paths,
			...(entry.property && { property: entry.property }),
			...(entry.knifeColor !== undefined && { knifeColor: entry.knifeColor }),
		};

		if (entry.isStartCard) {
			startCard = cardDef;
		} else {
			gameCards.push({ id: `card-${i}`, card: cardDef });
		}
	}

	if (!startCard) {
		throw new Error("No start card in deck definition");
	}

	return { deck: shuffle(gameCards), startCard };
}
