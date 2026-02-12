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

// ── Color System ──

const COLOR_MAP: Record<WormColor, string> = {
	black: "#2a2a2e",
	pink: "#e8457c",
	red: "#d93025",
	white: "#e8e6e3",
};

const COLOR_LIGHT_MAP: Record<WormColor, string> = {
	black: "#3d3d42",
	pink: "#f06e9a",
	red: "#e85a4f",
	white: "#f5f3f0",
};

const KNIFE_COLOR_MAP: Record<KnifeColor, string> = {
	black: "#2a2a2e",
	pink: "#e8457c",
	red: "#d93025",
	white: "#e8e6e3",
	rainbow: "url(#rainbow-gradient)",
};

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

const KNIFE_GLOW_MAP: Record<KnifeColor, string> = {
	black: "#555558",
	pink: "#e8457c",
	red: "#d93025",
	white: "#e8e6e3",
	rainbow: "#9b59b6",
};

// Card background
const WORM_BG = "#3d2e1e";
const WORM_STROKE = "#5a4530";
const TUNNEL_WALL = "#2e2015";
const TUNNEL_BUMPS = "#4a3520";

// ── Rotation Utilities ──

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

// ── Geometry ──

const EDGE_POINTS: Record<Direction, { x: number; y: number }> = {
	top: { x: 50, y: 0 },
	right: { x: 100, y: 50 },
	bottom: { x: 50, y: 100 },
	left: { x: 0, y: 50 },
};

const CENTER = { x: 50, y: 50 };
const WORM_WIDTH = 24;
const TUNNEL_WIDTH = WORM_WIDTH + 10;

function isOpposite(d1: Direction, d2: Direction): boolean {
	return (
		(d1 === "top" && d2 === "bottom") ||
		(d1 === "bottom" && d2 === "top") ||
		(d1 === "left" && d2 === "right") ||
		(d1 === "right" && d2 === "left")
	);
}

// ── Shared SVG Defs ──

function renderDefs(): ReactElement {
	return (
		<defs key="card-defs">
			{/* Dirt noise texture */}
			<filter id="dirt-noise" x="0%" y="0%" width="100%" height="100%">
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.65"
					numOctaves="3"
					seed="2"
					result="noise"
				/>
				<feColorMatrix
					type="matrix"
					in="noise"
					values="0 0 0 0 0.24
					        0 0 0 0 0.18
					        0 0 0 0 0.12
					        0 0 0 0.12 0"
				/>
			</filter>

			{/* Vignette gradient */}
			<radialGradient id="vignette" cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor="transparent" />
				<stop offset="70%" stopColor="transparent" />
				<stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
			</radialGradient>

			{/* Rainbow gradient for knife */}
			<linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
				<stop offset="0%" stopColor="#e8457c" />
				<stop offset="33%" stopColor="#d93025" />
				<stop offset="66%" stopColor="#e8e6e3" />
				<stop offset="100%" stopColor="#2a2a2e" />
			</linearGradient>

			{/* Worm stripe patterns — one per color */}
			{(["black", "pink", "red", "white"] as WormColor[]).map((color) => (
				<pattern
					key={`stripe-${color}`}
					id={`stripe-${color}`}
					patternUnits="userSpaceOnUse"
					width="8"
					height="8"
				>
					<rect width="8" height="8" fill={COLOR_MAP[color]} />
					<rect width="8" height="4" fill={COLOR_LIGHT_MAP[color]} />
				</pattern>
			))}
		</defs>
	);
}

// ── Background ──

function renderBackground(bgFill: string, bgStroke: string): ReactElement[] {
	return [
		<rect
			key="bg-base"
			x={1}
			y={1}
			width={98}
			height={98}
			rx={8}
			ry={8}
			fill={bgFill}
			stroke={bgStroke}
			strokeWidth={2}
		/>,
		<rect
			key="bg-noise"
			x={1}
			y={1}
			width={98}
			height={98}
			rx={8}
			ry={8}
			fill="transparent"
			filter="url(#dirt-noise)"
		/>,
		<rect
			key="bg-vignette"
			x={1}
			y={1}
			width={98}
			height={98}
			rx={8}
			ry={8}
			fill="url(#vignette)"
		/>,
	];
}

// ── Sparkle Diamonds ──

// Fixed positions to avoid randomness; we pick based on card directions
const SPARKLE_SETS: { x: number; y: number; s: number }[][] = [
	[
		{ x: 15, y: 18, s: 3.5 },
		{ x: 82, y: 25, s: 2.5 },
		{ x: 78, y: 78, s: 3 },
		{ x: 20, y: 85, s: 2 },
	],
	[
		{ x: 12, y: 75, s: 3 },
		{ x: 85, y: 15, s: 2.5 },
		{ x: 25, y: 22, s: 2 },
		{ x: 80, y: 82, s: 3.5 },
	],
	[
		{ x: 18, y: 40, s: 2.5 },
		{ x: 75, y: 18, s: 3 },
		{ x: 85, y: 65, s: 2 },
		{ x: 22, y: 80, s: 3 },
	],
];

function renderSparkles(setIndex: number): ReactElement[] {
	const sparkles = SPARKLE_SETS[setIndex % SPARKLE_SETS.length]!;
	return sparkles.map((sp) => (
		<rect
			key={`sparkle-${sp.x}-${sp.y}`}
			x={sp.x - sp.s / 2}
			y={sp.y - sp.s / 2}
			width={sp.s}
			height={sp.s}
			fill="rgba(255,255,255,0.15)"
			transform={`rotate(45 ${sp.x} ${sp.y})`}
		/>
	));
}

// ── Scalloped Tunnel Walls ──

function scalloppedLine(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	width: number,
	bumpSize: number,
): string {
	// Generate a filled path that represents a "tunnel" — the worm body channel
	// with scalloped bumpy edges on both sides
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len === 0) {
		return "";
	}

	// Normal perpendicular vector
	const nx = -dy / len;
	const ny = dx / len;

	const half = width / 2;
	const numBumps = Math.max(3, Math.floor(len / (bumpSize * 2)));

	// Build top edge with bumps (going from start to end)
	let topEdge = "";
	for (let i = 0; i <= numBumps; i++) {
		const t = i / numBumps;
		const px = x1 + dx * t;
		const py = y1 + dy * t;
		const ox = px + nx * half;
		const oy = py + ny * half;

		if (i === 0) {
			topEdge += `M ${ox} ${oy}`;
		} else {
			// Midpoint bump
			const mt = (i - 0.5) / numBumps;
			const mpx = x1 + dx * mt;
			const mpy = y1 + dy * mt;
			const bx = mpx + nx * (half + bumpSize);
			const by = mpy + ny * (half + bumpSize);
			topEdge += ` Q ${bx} ${by} ${ox} ${oy}`;
		}
	}

	// Build bottom edge with bumps (going from end back to start)
	let bottomEdge = "";
	for (let i = numBumps; i >= 0; i--) {
		const t = i / numBumps;
		const px = x1 + dx * t;
		const py = y1 + dy * t;
		const ox = px - nx * half;
		const oy = py - ny * half;

		if (i === numBumps) {
			bottomEdge += ` L ${ox} ${oy}`;
		} else {
			const mt = (i + 0.5) / numBumps;
			const mpx = x1 + dx * mt;
			const mpy = y1 + dy * mt;
			const bx = mpx - nx * (half + bumpSize);
			const by = mpy - ny * (half + bumpSize);
			bottomEdge += ` Q ${bx} ${by} ${ox} ${oy}`;
		}
	}

	return `${topEdge}${bottomEdge} Z`;
}

function scalloppedCorner(
	p1: { x: number; y: number },
	p2: { x: number; y: number },
	ctrl: { x: number; y: number },
	width: number,
	bumpSize: number,
): string {
	// Approximate the bezier with line segments, then build a scalloped outline
	const segments = 12;
	const points: { x: number; y: number }[] = [];

	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const u = 1 - t;
		const x = u * u * p1.x + 2 * u * t * ctrl.x + t * t * p2.x;
		const y = u * u * p1.y + 2 * u * t * ctrl.y + t * t * p2.y;
		points.push({ x, y });
	}

	const half = width / 2;

	// Compute normals at each point
	const normals: { x: number; y: number }[] = [];
	for (let i = 0; i < points.length; i++) {
		let dx: number;
		let dy: number;
		if (i === 0) {
			dx = points[1]!.x - points[0]!.x;
			dy = points[1]!.y - points[0]!.y;
		} else if (i === points.length - 1) {
			dx = points[i]!.x - points[i - 1]!.x;
			dy = points[i]!.y - points[i - 1]!.y;
		} else {
			dx = points[i + 1]!.x - points[i - 1]!.x;
			dy = points[i + 1]!.y - points[i - 1]!.y;
		}
		const len = Math.sqrt(dx * dx + dy * dy) || 1;
		normals.push({ x: -dy / len, y: dx / len });
	}

	// Outer edge (with bumps)
	const outerPts: { x: number; y: number }[] = [];
	const innerPts: { x: number; y: number }[] = [];

	for (let i = 0; i < points.length; i++) {
		const p = points[i]!;
		const n = normals[i]!;
		const bumpOffset = i % 2 === 0 ? 0 : bumpSize;
		outerPts.push({
			x: p.x + n.x * (half + bumpOffset),
			y: p.y + n.y * (half + bumpOffset),
		});
		innerPts.push({
			x: p.x - n.x * (half + (i % 2 === 1 ? bumpSize : 0)),
			y: p.y - n.y * (half + (i % 2 === 1 ? bumpSize : 0)),
		});
	}

	let d = `M ${outerPts[0]!.x} ${outerPts[0]!.y}`;
	for (let i = 1; i < outerPts.length; i++) {
		d += ` L ${outerPts[i]!.x} ${outerPts[i]!.y}`;
	}
	// Connect to inner and go back
	for (let i = innerPts.length - 1; i >= 0; i--) {
		d += ` L ${innerPts[i]!.x} ${innerPts[i]!.y}`;
	}
	d += " Z";

	return d;
}

function renderTunnelWall(path: CardPath, index: number): ReactElement[] {
	const elements: ReactElement[] = [];
	const bumpSize = 3;

	if (path.directions.length === 1) {
		const dir = path.directions[0]!;
		const edge = EDGE_POINTS[dir];
		const wallPath = scalloppedLine(edge.x, edge.y, CENTER.x, CENTER.y, TUNNEL_WIDTH, bumpSize);
		elements.push(<path key={`tunnel-head-${index}`} d={wallPath} fill={TUNNEL_WALL} />);
		// Bumpy circle around head
		elements.push(
			<circle
				key={`tunnel-head-cap-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={TUNNEL_WIDTH / 2 + 2}
				fill={TUNNEL_WALL}
			/>,
		);
	}

	if (path.directions.length === 2) {
		const [d1, d2] = path.directions as [Direction, Direction];
		const p1 = EDGE_POINTS[d1];
		const p2 = EDGE_POINTS[d2];

		if (isOpposite(d1, d2)) {
			const wallPath = scalloppedLine(p1.x, p1.y, p2.x, p2.y, TUNNEL_WIDTH, bumpSize);
			elements.push(<path key={`tunnel-straight-${index}`} d={wallPath} fill={TUNNEL_WALL} />);
		} else {
			const wallPath = scalloppedCorner(p1, p2, CENTER, TUNNEL_WIDTH, bumpSize);
			elements.push(<path key={`tunnel-corner-${index}`} d={wallPath} fill={TUNNEL_WALL} />);
		}
	}

	if (path.directions.length === 3) {
		for (let i = 0; i < path.directions.length; i++) {
			const dir = path.directions[i]!;
			const edge = EDGE_POINTS[dir];
			const wallPath = scalloppedLine(edge.x, edge.y, CENTER.x, CENTER.y, TUNNEL_WIDTH, bumpSize);
			elements.push(<path key={`tunnel-t-${index}-${i}`} d={wallPath} fill={TUNNEL_WALL} />);
		}
		elements.push(
			<circle
				key={`tunnel-t-center-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={TUNNEL_WIDTH / 2 + 1}
				fill={TUNNEL_WALL}
			/>,
		);
	}

	if (path.directions.length === 4) {
		const wallV = scalloppedLine(50, 0, 50, 100, TUNNEL_WIDTH, bumpSize);
		const wallH = scalloppedLine(0, 50, 100, 50, TUNNEL_WIDTH, bumpSize);
		elements.push(<path key={`tunnel-cross-v-${index}`} d={wallV} fill={TUNNEL_WALL} />);
		elements.push(<path key={`tunnel-cross-h-${index}`} d={wallH} fill={TUNNEL_WALL} />);
		elements.push(
			<circle
				key={`tunnel-cross-center-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={TUNNEL_WIDTH / 2 + 1}
				fill={TUNNEL_WALL}
			/>,
		);
	}

	return elements;
}

// ── Inner Tunnel Bumps (lighter bumps on tunnel inner edge) ──

function renderTunnelInnerBumps(path: CardPath, index: number): ReactElement[] {
	const elements: ReactElement[] = [];
	const innerBumpWidth = WORM_WIDTH + 4;
	const bumpSize = 2.5;

	if (path.directions.length === 1) {
		const dir = path.directions[0]!;
		const edge = EDGE_POINTS[dir];
		const d = scalloppedLine(edge.x, edge.y, CENTER.x, CENTER.y, innerBumpWidth, bumpSize);
		elements.push(<path key={`inner-bump-head-${index}`} d={d} fill={TUNNEL_BUMPS} />);
		elements.push(
			<circle
				key={`inner-bump-head-cap-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={innerBumpWidth / 2 + 1}
				fill={TUNNEL_BUMPS}
			/>,
		);
	}

	if (path.directions.length === 2) {
		const [d1, d2] = path.directions as [Direction, Direction];
		const p1 = EDGE_POINTS[d1];
		const p2 = EDGE_POINTS[d2];

		if (isOpposite(d1, d2)) {
			const d = scalloppedLine(p1.x, p1.y, p2.x, p2.y, innerBumpWidth, bumpSize);
			elements.push(<path key={`inner-bump-straight-${index}`} d={d} fill={TUNNEL_BUMPS} />);
		} else {
			const d = scalloppedCorner(p1, p2, CENTER, innerBumpWidth, bumpSize);
			elements.push(<path key={`inner-bump-corner-${index}`} d={d} fill={TUNNEL_BUMPS} />);
		}
	}

	if (path.directions.length === 3) {
		for (let i = 0; i < path.directions.length; i++) {
			const dir = path.directions[i]!;
			const edge = EDGE_POINTS[dir];
			const d = scalloppedLine(edge.x, edge.y, CENTER.x, CENTER.y, innerBumpWidth, bumpSize);
			elements.push(<path key={`inner-bump-t-${index}-${i}`} d={d} fill={TUNNEL_BUMPS} />);
		}
		elements.push(
			<circle
				key={`inner-bump-t-center-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={innerBumpWidth / 2}
				fill={TUNNEL_BUMPS}
			/>,
		);
	}

	if (path.directions.length === 4) {
		const dV = scalloppedLine(50, 0, 50, 100, innerBumpWidth, bumpSize);
		const dH = scalloppedLine(0, 50, 100, 50, innerBumpWidth, bumpSize);
		elements.push(<path key={`inner-bump-cross-v-${index}`} d={dV} fill={TUNNEL_BUMPS} />);
		elements.push(<path key={`inner-bump-cross-h-${index}`} d={dH} fill={TUNNEL_BUMPS} />);
		elements.push(
			<circle
				key={`inner-bump-cross-center-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={innerBumpWidth / 2}
				fill={TUNNEL_BUMPS}
			/>,
		);
	}

	return elements;
}

// ── Worm Body Rendering (with stripes) ──

function renderPath(path: CardPath, index: number): ReactElement[] {
	const color = COLOR_MAP[path.color];
	const stripePattern = `url(#stripe-${path.color})`;
	const elements: ReactElement[] = [];

	if (path.directions.length === 1) {
		const dir = path.directions[0]!;
		const edge = EDGE_POINTS[dir];

		// Body with stripe pattern
		elements.push(
			<line
				key={`head-line-${index}`}
				x1={edge.x}
				y1={edge.y}
				x2={CENTER.x}
				y2={CENTER.y}
				stroke={stripePattern}
				strokeWidth={WORM_WIDTH}
				strokeLinecap="round"
			/>,
		);
		// Head cap (solid color, slightly larger)
		elements.push(
			<circle
				key={`head-cap-${index}`}
				cx={CENTER.x}
				cy={CENTER.y}
				r={WORM_WIDTH / 2 + 3}
				fill={color}
			/>,
		);
		// Subtle highlight on head
		elements.push(
			<ellipse
				key={`head-highlight-${index}`}
				cx={CENTER.x - 2}
				cy={CENTER.y - 3}
				rx={6}
				ry={4}
				fill="rgba(255,255,255,0.15)"
			/>,
		);
		return elements;
	}

	if (path.directions.length === 2) {
		const [d1, d2] = path.directions as [Direction, Direction];
		const p1 = EDGE_POINTS[d1];
		const p2 = EDGE_POINTS[d2];

		if (isOpposite(d1, d2)) {
			elements.push(
				<line
					key={`straight-${index}`}
					x1={p1.x}
					y1={p1.y}
					x2={p2.x}
					y2={p2.y}
					stroke={stripePattern}
					strokeWidth={WORM_WIDTH}
					strokeLinecap="butt"
				/>,
			);
		} else {
			elements.push(
				<path
					key={`corner-${index}`}
					d={`M ${p1.x} ${p1.y} Q ${CENTER.x} ${CENTER.y} ${p2.x} ${p2.y}`}
					stroke={stripePattern}
					strokeWidth={WORM_WIDTH}
					strokeLinecap="butt"
					fill="none"
				/>,
			);
		}
		return elements;
	}

	if (path.directions.length === 3) {
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
					stroke={stripePattern}
					strokeWidth={WORM_WIDTH}
					strokeLinecap="butt"
				/>,
			);
		}
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
		elements.push(
			<line
				key={`cross-v-${index}`}
				x1={50}
				y1={0}
				x2={50}
				y2={100}
				stroke={stripePattern}
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
				stroke={stripePattern}
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

// ── Worm Head Faces ──

function renderHeadFace(color: WormColor, direction: Direction): ReactElement[] {
	const elements: ReactElement[] = [];

	// Offset face slightly away from the edge direction
	const faceOffset = { x: 0, y: 0 };
	if (direction === "top") {
		faceOffset.y = 4;
	}
	if (direction === "bottom") {
		faceOffset.y = -4;
	}
	if (direction === "left") {
		faceOffset.x = 4;
	}
	if (direction === "right") {
		faceOffset.x = -4;
	}

	const cx = CENTER.x + faceOffset.x;
	const cy = CENTER.y + faceOffset.y;

	switch (color) {
		case "pink": {
			// Cute: round eyes with highlights, rosy cheeks, tiny smile
			// Left eye
			elements.push(<circle key="face-eye-l" cx={cx - 5} cy={cy - 2} r={3} fill="#121015" />);
			elements.push(<circle key="face-eye-l-hi" cx={cx - 6} cy={cy - 3} r={1.2} fill="white" />);
			// Right eye
			elements.push(<circle key="face-eye-r" cx={cx + 5} cy={cy - 2} r={3} fill="#121015" />);
			elements.push(<circle key="face-eye-r-hi" cx={cx + 4} cy={cy - 3} r={1.2} fill="white" />);
			// Rosy cheeks
			elements.push(
				<circle key="face-cheek-l" cx={cx - 8} cy={cy + 2} r={2.5} fill="rgba(255,150,180,0.5)" />,
			);
			elements.push(
				<circle key="face-cheek-r" cx={cx + 8} cy={cy + 2} r={2.5} fill="rgba(255,150,180,0.5)" />,
			);
			// Smile
			elements.push(
				<path
					key="face-mouth"
					d={`M ${cx - 3} ${cy + 4} Q ${cx} ${cy + 7} ${cx + 3} ${cy + 4}`}
					stroke="#121015"
					strokeWidth={1}
					fill="none"
					strokeLinecap="round"
				/>,
			);
			break;
		}
		case "red": {
			// Mischievous: angled eyebrows, sharp grin with teeth
			// Angry eyebrows
			elements.push(
				<line
					key="face-brow-l"
					x1={cx - 8}
					y1={cy - 5}
					x2={cx - 3}
					y2={cy - 3}
					stroke="#121015"
					strokeWidth={1.5}
					strokeLinecap="round"
				/>,
			);
			elements.push(
				<line
					key="face-brow-r"
					x1={cx + 8}
					y1={cy - 5}
					x2={cx + 3}
					y2={cy - 3}
					stroke="#121015"
					strokeWidth={1.5}
					strokeLinecap="round"
				/>,
			);
			// Eyes
			elements.push(<circle key="face-eye-l" cx={cx - 5} cy={cy - 1} r={2.5} fill="#121015" />);
			elements.push(<circle key="face-eye-l-hi" cx={cx - 6} cy={cy - 2} r={1} fill="#ffcc00" />);
			elements.push(<circle key="face-eye-r" cx={cx + 5} cy={cy - 1} r={2.5} fill="#121015" />);
			elements.push(<circle key="face-eye-r-hi" cx={cx + 4} cy={cy - 2} r={1} fill="#ffcc00" />);
			// Toothy grin
			elements.push(
				<path
					key="face-mouth"
					d={`M ${cx - 6} ${cy + 3} L ${cx - 2} ${cy + 6} L ${cx + 2} ${cy + 6} L ${cx + 6} ${cy + 3}`}
					stroke="#121015"
					strokeWidth={1}
					fill="#8b0000"
					strokeLinejoin="round"
				/>,
			);
			// Teeth
			elements.push(
				<line
					key="face-tooth-1"
					x1={cx - 2}
					y1={cy + 3.5}
					x2={cx - 2}
					y2={cy + 5}
					stroke="#e8e6e3"
					strokeWidth={1.2}
				/>,
			);
			elements.push(
				<line
					key="face-tooth-2"
					x1={cx + 2}
					y1={cy + 3.5}
					x2={cx + 2}
					y2={cy + 5}
					stroke="#e8e6e3"
					strokeWidth={1.2}
				/>,
			);
			break;
		}
		case "black": {
			// Menacing: narrow slit eyes, wide grin
			// Slit eyes
			elements.push(
				<ellipse key="face-eye-l" cx={cx - 5} cy={cy - 1} rx={3} ry={1.5} fill="#555" />,
			);
			elements.push(
				<ellipse key="face-eye-l-pupil" cx={cx - 5} cy={cy - 1} rx={1.5} ry={1.5} fill="#aaffaa" />,
			);
			elements.push(
				<ellipse key="face-eye-r" cx={cx + 5} cy={cy - 1} rx={3} ry={1.5} fill="#555" />,
			);
			elements.push(
				<ellipse key="face-eye-r-pupil" cx={cx + 5} cy={cy - 1} rx={1.5} ry={1.5} fill="#aaffaa" />,
			);
			// Wide menacing grin
			elements.push(
				<path
					key="face-mouth"
					d={`M ${cx - 7} ${cy + 3} Q ${cx} ${cy + 9} ${cx + 7} ${cy + 3}`}
					stroke="#555"
					strokeWidth={1.2}
					fill="#1a1a1a"
					strokeLinecap="round"
				/>,
			);
			// Small bumps/horns
			elements.push(<circle key="face-horn-l" cx={cx - 6} cy={cy - 8} r={2} fill="#3d3d42" />);
			elements.push(<circle key="face-horn-r" cx={cx + 6} cy={cy - 8} r={2} fill="#3d3d42" />);
			break;
		}
		case "white": {
			// Scared: wide oval eyes, open mouth, sweat drops
			// Wide eyes
			elements.push(
				<ellipse
					key="face-eye-l"
					cx={cx - 5}
					cy={cy - 2}
					rx={3.5}
					ry={4}
					fill="white"
					stroke="#555"
					strokeWidth={0.7}
				/>,
			);
			elements.push(<circle key="face-eye-l-pupil" cx={cx - 5} cy={cy - 1} r={2} fill="#121015" />);
			elements.push(<circle key="face-eye-l-hi" cx={cx - 6} cy={cy - 3} r={1} fill="white" />);
			elements.push(
				<ellipse
					key="face-eye-r"
					cx={cx + 5}
					cy={cy - 2}
					rx={3.5}
					ry={4}
					fill="white"
					stroke="#555"
					strokeWidth={0.7}
				/>,
			);
			elements.push(<circle key="face-eye-r-pupil" cx={cx + 5} cy={cy - 1} r={2} fill="#121015" />);
			elements.push(<circle key="face-eye-r-hi" cx={cx + 4} cy={cy - 3} r={1} fill="white" />);
			// Open mouth (O shape)
			elements.push(
				<ellipse
					key="face-mouth"
					cx={cx}
					cy={cy + 5}
					rx={3}
					ry={3.5}
					fill="#888"
					stroke="#555"
					strokeWidth={0.7}
				/>,
			);
			// Sweat drop
			elements.push(
				<ellipse
					key="face-sweat"
					cx={cx + 9}
					cy={cy - 4}
					rx={1.2}
					ry={2}
					fill="rgba(150,200,255,0.6)"
				/>,
			);
			break;
		}
	}

	return elements;
}

// ── Knife Card ──

function renderKnife(knifeColor: KnifeColor): ReactElement[] {
	const bladeColor = KNIFE_COLOR_MAP[knifeColor];
	const glowColor = KNIFE_GLOW_MAP[knifeColor];
	const elements: ReactElement[] = [];

	// Radial glow behind the blade
	elements.push(
		<defs key="knife-defs">
			<radialGradient id="knife-glow" cx="50%" cy="45%" r="45%">
				<stop offset="0%" stopColor={glowColor} stopOpacity="0.3" />
				<stop offset="100%" stopColor="transparent" />
			</radialGradient>
		</defs>,
	);
	elements.push(
		<rect
			key="knife-glow-rect"
			x={5}
			y={5}
			width={90}
			height={90}
			rx={5}
			fill="url(#knife-glow)"
		/>,
	);

	// Cleaver blade shape
	elements.push(
		<path
			key="blade"
			d="M 35 18 L 65 18 Q 70 18 70 24 L 70 55 Q 70 62 63 62 L 37 62 Q 30 62 30 55 L 30 24 Q 30 18 35 18 Z"
			fill={bladeColor}
			stroke="#555"
			strokeWidth={1.5}
		/>,
	);
	// Blade highlight
	elements.push(
		<path
			key="blade-highlight"
			d="M 36 20 L 50 20 L 50 58 L 36 58 Q 32 58 32 52 L 32 26 Q 32 20 36 20 Z"
			fill="rgba(255,255,255,0.1)"
		/>,
	);
	// Blade hole
	elements.push(
		<circle
			key="blade-hole"
			cx={50}
			cy={28}
			r={3}
			fill={KNIFE_BG_MAP[knifeColor]}
			stroke="#555"
			strokeWidth={0.8}
		/>,
	);
	// Handle
	elements.push(
		<rect
			key="handle"
			x={44}
			y={62}
			width={12}
			height={22}
			rx={2}
			fill="#6b5b4a"
			stroke="#555"
			strokeWidth={1}
		/>,
	);
	// Handle rivets
	elements.push(<circle key="rivet-1" cx={50} cy={68} r={1.5} fill="#888" />);
	elements.push(<circle key="rivet-2" cx={50} cy={78} r={1.5} fill="#888" />);

	// Sparkles around blade
	const sparklePositions = [
		{ x: 22, y: 25, s: 3 },
		{ x: 78, y: 20, s: 2.5 },
		{ x: 80, y: 50, s: 2 },
		{ x: 20, y: 55, s: 2.5 },
	];
	for (const sp of sparklePositions) {
		elements.push(
			<rect
				key={`knife-sparkle-${sp.x}-${sp.y}`}
				x={sp.x - sp.s / 2}
				y={sp.y - sp.s / 2}
				width={sp.s}
				height={sp.s}
				fill="rgba(255,255,255,0.25)"
				transform={`rotate(45 ${sp.x} ${sp.y})`}
			/>,
		);
	}

	return elements;
}

// ── Property Badge (styled field-note) ──

// SVG icon paths for each trait
function renderTraitIcon(
	trait: Exclude<CardTrait, "START" | "CUT">,
	x: number,
	y: number,
): ReactElement {
	switch (trait) {
		case "DIG":
			// Shovel
			return (
				<g key="trait-icon" transform={`translate(${x},${y})`}>
					{/* Handle */}
					<line
						x1={0}
						y1={1}
						x2={0}
						y2={8}
						stroke="#4a3520"
						strokeWidth={1.5}
						strokeLinecap="round"
					/>
					{/* T-grip */}
					<line
						x1={-2.5}
						y1={1}
						x2={2.5}
						y2={1}
						stroke="#4a3520"
						strokeWidth={1.5}
						strokeLinecap="round"
					/>
					{/* Blade */}
					<path d="M -3 8 L -3.5 12 Q 0 14.5 3.5 12 L 3 8 Z" fill="#4a3520" />
				</g>
			);
		case "SWAP":
			// Two curved arrows
			return (
				<g key="trait-icon" transform={`translate(${x},${y})`}>
					<path
						d="M -4 3 Q 0 -1 4 3"
						stroke="#4a3520"
						strokeWidth={1.2}
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d="M 2 1 L 4 3 L 2 5"
						stroke="#4a3520"
						strokeWidth={1.2}
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="M 4 9 Q 0 13 -4 9"
						stroke="#4a3520"
						strokeWidth={1.2}
						fill="none"
						strokeLinecap="round"
					/>
					<path
						d="M -2 7 L -4 9 L -2 11"
						stroke="#4a3520"
						strokeWidth={1.2}
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</g>
			);
		case "HATCH":
			// Cracked egg
			return (
				<g key="trait-icon" transform={`translate(${x},${y})`}>
					<ellipse cx={0} cy={6} rx={4} ry={5} fill="none" stroke="#4a3520" strokeWidth={1.2} />
					<path
						d="M -3 4 L -1 2 L 1 5 L 3 3"
						stroke="#4a3520"
						strokeWidth={1}
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</g>
			);
		case "PEEK":
			// Eye
			return (
				<g key="trait-icon" transform={`translate(${x},${y})`}>
					<path d="M -5 6 Q 0 1 5 6 Q 0 11 -5 6 Z" fill="none" stroke="#4a3520" strokeWidth={1.2} />
					<circle cx={0} cy={6} r={2} fill="#4a3520" />
				</g>
			);
	}
}

function renderPropertyBadge(
	trait: Exclude<CardTrait, "START" | "CUT">,
	multiplier: number,
): ReactElement {
	const badgeWidth = multiplier > 1 ? 32 : 22;
	const badgeHeight = 22;

	return (
		<g key="property-badge" transform="rotate(-3 14 14)">
			{/* Badge background — cream paper */}
			<rect
				x={3}
				y={3}
				width={badgeWidth}
				height={badgeHeight}
				rx={2}
				fill="#f0ead6"
				stroke="#b5a88a"
				strokeWidth={1}
			/>
			{/* Rough edge accents */}
			<line x1={3} y1={6} x2={5} y2={6} stroke="#d4cbaf" strokeWidth={0.5} />
			<line x1={3} y1={10} x2={4.5} y2={10} stroke="#d4cbaf" strokeWidth={0.5} />
			<line x1={3} y1={14} x2={5} y2={14} stroke="#d4cbaf" strokeWidth={0.5} />
			<line x1={3} y1={18} x2={4} y2={18} stroke="#d4cbaf" strokeWidth={0.5} />

			{/* Icon */}
			{renderTraitIcon(trait, 14, 4)}

			{/* Multiplier text */}
			{multiplier > 1 && (
				<text
					x={27}
					y={19}
					textAnchor="middle"
					fill="#4a3520"
					fontSize={9}
					fontWeight="bold"
					fontFamily="sans-serif"
				>
					x{multiplier}
				</text>
			)}
		</g>
	);
}

// ── Main Component ──

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
	const isStart = property?.trait === "START";

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

	// Determine sparkle set based on simple hash of card paths
	const sparkleIndex = isKnife ? 0 : rotated.reduce((acc, p) => acc + p.directions.length, 0);

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
			{renderDefs()}

			{/* Background layers */}
			{ghost ? (
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
			) : (
				renderBackground(bgFill, bgStroke)
			)}

			{/* Sparkle diamonds in dirt */}
			{!ghost && !isKnife && renderSparkles(sparkleIndex)}

			{/* Card content */}
			{isKnife ? (
				renderKnife(knifeColor)
			) : (
				<>
					{/* Tunnel walls (dark border with scalloped bumps) */}
					{rotated.flatMap((path, i) => renderTunnelWall(path, i))}
					{/* Inner tunnel bumps (lighter) */}
					{rotated.flatMap((path, i) => renderTunnelInnerBumps(path, i))}
					{/* Worm body with stripes */}
					{rotated.flatMap((path, i) => renderPath(path, i))}
					{/* Head faces */}
					{card.type === "head" &&
						rotated.map((path) => {
							if (path.directions.length !== 1) {
								return null;
							}
							const dir = path.directions[0]!;
							return <g key={`face-${path.color}-${dir}`}>{renderHeadFace(path.color, dir)}</g>;
						})}
				</>
			)}

			{/* Property badge */}
			{showBadge &&
				renderPropertyBadge(
					property.trait as Exclude<CardTrait, "START" | "CUT">,
					property.multiplier,
				)}

			{/* START badge */}
			{isStart && (
				<g key="start-badge" transform="translate(50, 8)">
					<rect
						x={-18}
						y={-6}
						width={36}
						height={14}
						rx={2}
						fill="#f0ead6"
						stroke="#b5a88a"
						strokeWidth={1}
					/>
					<text
						x={0}
						y={5}
						textAnchor="middle"
						fill="#4a3520"
						fontSize={9}
						fontWeight="bold"
						fontFamily="sans-serif"
						letterSpacing={0.5}
					>
						START
					</text>
				</g>
			)}

			{/* Sparkles on knife cards */}
			{!ghost && isKnife && renderSparkles(1)}
		</svg>
	);
}
