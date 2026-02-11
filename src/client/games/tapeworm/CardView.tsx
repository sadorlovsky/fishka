import type { ReactElement } from "react";
import type {
	CardDefinition,
	CardPath,
	CardTrait,
	Direction,
	KnifeColor,
	Rotation,
	WormColor,
} from "@/shared/types/tapeworm";

const COLOR_MAP: Record<WormColor, string> = {
	black: "#2a2a2e",
	pink: "#e8457c",
	red: "#d93025",
	white: "#e8e6e3",
};

const KNIFE_COLOR_MAP: Record<KnifeColor, string> = {
	black: "#2a2a2e",
	pink: "#e8457c",
	red: "#d93025",
	white: "#e8e6e3",
	rainbow: "url(#rainbow-gradient)",
};

// Card background fills
const WORM_BG = "#3d2e1e";
const WORM_STROKE = "#5a4530";

const KNIFE_BG_MAP: Record<KnifeColor, string> = {
	black: "#2a2a2e",
	pink: "#3d1e2e",
	red: "#3d1e1e",
	white: "#3d3a36",
	rainbow: "#2a1e30",
};

const KNIFE_STROKE_MAP: Record<KnifeColor, string> = {
	black: "#444448",
	pink: "#5a3048",
	red: "#5a3030",
	white: "#5a5650",
	rainbow: "#4a3d5e",
};

const TRAIT_ICONS: Record<Exclude<CardTrait, "START" | "CUT">, string> = {
	DIG: "\u26CF\uFE0F",
	SWAP: "\uD83D\uDD04",
	HATCH: "\uD83D\uDC23",
	PEEK: "\uD83D\uDC41\uFE0F",
};

const ROTATION_MAP: Record<Direction, Direction> = {
	top: "right",
	right: "bottom",
	bottom: "left",
	left: "top",
};

function rotateDirection(dir: Direction, rotation: Rotation): Direction {
	let d = dir;
	const steps = rotation / 90;
	for (let i = 0; i < steps; i++) {
		d = ROTATION_MAP[d];
	}
	return d;
}

function rotatePaths(paths: CardPath[], rotation: Rotation): CardPath[] {
	if (rotation === 0) {
		return paths;
	}
	return paths.map((p) => ({
		...p,
		directions: p.directions.map((d) => rotateDirection(d, rotation)),
	}));
}

// Edge midpoints on a 100x100 SVG
const EDGE_POINTS: Record<Direction, { x: number; y: number }> = {
	top: { x: 50, y: 0 },
	right: { x: 100, y: 50 },
	bottom: { x: 50, y: 100 },
	left: { x: 0, y: 50 },
};

const CENTER = { x: 50, y: 50 };
const WORM_WIDTH = 22;

function renderPath(path: CardPath, index: number): ReactElement[] {
	const color = COLOR_MAP[path.color];
	const elements: ReactElement[] = [];

	if (path.directions.length === 1) {
		// Head card — line from edge to center with a circle cap
		const dir = path.directions[0]!;
		const edge = EDGE_POINTS[dir];
		elements.push(
			<line
				key={`head-line-${index}`}
				x1={edge.x}
				y1={edge.y}
				x2={CENTER.x}
				y2={CENTER.y}
				stroke={color}
				strokeWidth={WORM_WIDTH}
				strokeLinecap="round"
			/>,
		);
		elements.push(
			<circle
				key={`head-cap-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={WORM_WIDTH / 2 + 2}
				fill={color}
			/>,
		);
		// Eye
		elements.push(
			<circle key={`head-eye-${index}`} cx={CENTER.x} cy={CENTER.y} r={4} fill="#121015" />,
		);
		return elements;
	}

	if (path.directions.length === 2) {
		const [d1, d2] = path.directions as [Direction, Direction];
		const p1 = EDGE_POINTS[d1];
		const p2 = EDGE_POINTS[d2];

		// Check if opposite (straight) or adjacent (corner)
		const isOpposite =
			(d1 === "top" && d2 === "bottom") ||
			(d1 === "bottom" && d2 === "top") ||
			(d1 === "left" && d2 === "right") ||
			(d1 === "right" && d2 === "left");

		if (isOpposite) {
			// Straight line through center
			elements.push(
				<line
					key={`straight-${index}`}
					x1={p1.x}
					y1={p1.y}
					x2={p2.x}
					y2={p2.y}
					stroke={color}
					strokeWidth={WORM_WIDTH}
					strokeLinecap="butt"
				/>,
			);
		} else {
			// Corner — quadratic bezier through center
			elements.push(
				<path
					key={`corner-${index}`}
					d={`M ${p1.x} ${p1.y} Q ${CENTER.x} ${CENTER.y} ${p2.x} ${p2.y}`}
					stroke={color}
					strokeWidth={WORM_WIDTH}
					strokeLinecap="butt"
					fill="none"
				/>,
			);
		}
		return elements;
	}

	if (path.directions.length === 3) {
		// T-junction: draw lines from each direction to center
		for (let i = 0; i < path.directions.length; i++) {
			const dir = path.directions[i]!;
			const edge = EDGE_POINTS[dir];
			elements.push(
				<line
					key={`t-${index}-${i}`}
					x1={edge.x}
					y1={edge.y}
					x2={CENTER.x}
					y2={CENTER.y}
					stroke={color}
					strokeWidth={WORM_WIDTH}
					strokeLinecap="butt"
				/>,
			);
		}
		// Center circle to smooth the junction
		elements.push(
			<circle
				key={`t-center-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={WORM_WIDTH / 2}
				fill={color}
			/>,
		);
		return elements;
	}

	if (path.directions.length === 4) {
		// Cross (single color): draw lines through center both ways
		elements.push(
			<line
				key={`cross-v-${index}`}
				x1={50}
				y1={0}
				x2={50}
				y2={100}
				stroke={color}
				strokeWidth={WORM_WIDTH}
				strokeLinecap="butt"
			/>,
		);
		elements.push(
			<line
				key={`cross-h-${index}`}
				x1={0}
				y1={50}
				x2={100}
				y2={50}
				stroke={color}
				strokeWidth={WORM_WIDTH}
				strokeLinecap="butt"
			/>,
		);
		elements.push(
			<circle
				key={`cross-center-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={WORM_WIDTH / 2}
				fill={color}
			/>,
		);
		return elements;
	}

	return elements;
}

function renderKnife(knifeColor: KnifeColor): ReactElement[] {
	const bladeColor = KNIFE_COLOR_MAP[knifeColor];
	const elements: ReactElement[] = [];

	// Rainbow gradient definition
	if (knifeColor === "rainbow") {
		elements.push(
			<defs key="rainbow-defs">
				<linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stopColor="#e8457c" />
					<stop offset="33%" stopColor="#d93025" />
					<stop offset="66%" stopColor="#e8e6e3" />
					<stop offset="100%" stopColor="#2a2a2e" />
				</linearGradient>
			</defs>,
		);
	}

	// Scissors icon
	// Blade 1
	elements.push(
		<ellipse
			key="blade-1"
			cx={38}
			cy={35}
			rx={14}
			ry={6}
			fill={bladeColor}
			transform="rotate(-30 38 35)"
			stroke="#555"
			strokeWidth={1}
		/>,
	);
	// Blade 2
	elements.push(
		<ellipse
			key="blade-2"
			cx={62}
			cy={35}
			rx={14}
			ry={6}
			fill={bladeColor}
			transform="rotate(30 62 35)"
			stroke="#555"
			strokeWidth={1}
		/>,
	);
	// Handle circles
	elements.push(
		<circle key="handle-1" cx={35} cy={70} r={10} fill="none" stroke="#888" strokeWidth={3} />,
	);
	elements.push(
		<circle key="handle-2" cx={65} cy={70} r={10} fill="none" stroke="#888" strokeWidth={3} />,
	);
	// Connection lines
	elements.push(
		<line
			key="conn-1"
			x1={42}
			y1={62}
			x2={45}
			y2={45}
			stroke="#888"
			strokeWidth={3}
			strokeLinecap="round"
		/>,
	);
	elements.push(
		<line
			key="conn-2"
			x1={58}
			y1={62}
			x2={55}
			y2={45}
			stroke="#888"
			strokeWidth={3}
			strokeLinecap="round"
		/>,
	);

	return elements;
}

function renderPropertyBadge(
	trait: Exclude<CardTrait, "START" | "CUT">,
	multiplier: number,
): ReactElement {
	const icon = TRAIT_ICONS[trait];
	const label = multiplier > 1 ? `${icon}x${multiplier}` : icon;
	const width = multiplier > 1 ? 42 : 30;

	return (
		<g key="property-badge">
			<rect
				x={2}
				y={2}
				width={width}
				height={24}
				rx={5}
				fill="rgba(0,0,0,0.75)"
				stroke="rgba(255,255,255,0.25)"
				strokeWidth={0.5}
			/>
			<text
				x={2 + width / 2}
				y={17}
				textAnchor="middle"
				fill="white"
				fontSize={multiplier > 1 ? 12 : 15}
				fontFamily="sans-serif"
			>
				{label}
			</text>
		</g>
	);
}

interface CardViewProps {
	card: CardDefinition;
	rotation?: Rotation;
	size?: number;
	onClick?: () => void;
	className?: string;
	ghost?: boolean;
}

export function CardView({
	card,
	rotation = 0,
	size = 64,
	onClick,
	className = "",
	ghost = false,
}: CardViewProps) {
	const isKnife = card.type === "knife";
	const rotated = isKnife ? [] : rotatePaths(card.paths, rotation);

	const property = card.property;
	const showBadge = property && property.trait !== "START" && property.trait !== "CUT";

	const knifeColor = card.knifeColor ?? "rainbow";
	let bgFill: string;
	let bgStroke: string;
	if (ghost) {
		bgFill = "rgba(255,255,255,0.05)";
		bgStroke = "rgba(255,255,255,0.15)";
	} else if (isKnife) {
		bgFill = KNIFE_BG_MAP[knifeColor];
		bgStroke = KNIFE_STROKE_MAP[knifeColor];
	} else {
		bgFill = WORM_BG;
		bgStroke = WORM_STROKE;
	}

	return (
		<svg
			viewBox="0 0 100 100"
			width={size}
			height={size}
			role="img"
			aria-label={isKnife ? "Knife card" : `${card.type} card`}
			className={className}
			onClick={onClick}
			style={{
				opacity: ghost ? 0.3 : 1,
				cursor: onClick ? "pointer" : "default",
			}}
		>
			<rect
				x={1}
				y={1}
				width={98}
				height={98}
				rx={8}
				ry={8}
				fill={bgFill}
				stroke={bgStroke}
				strokeWidth={2}
			/>
			{isKnife
				? renderKnife(card.knifeColor ?? "rainbow")
				: rotated.flatMap((path, i) => renderPath(path, i))}
			{showBadge &&
				renderPropertyBadge(
					property.trait as Exclude<CardTrait, "START" | "CUT">,
					property.multiplier,
				)}
		</svg>
	);
}
