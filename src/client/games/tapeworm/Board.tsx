import { useDroppable } from "@dnd-kit/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
	CardDefinition,
	CutTarget,
	PlacedCard,
	Rotation,
	ValidPlacement,
} from "@/shared/types/tapeworm";
import { CardView } from "./CardView";

const CELL_SIZE = 72;
const GAP = 2;
const CELL_STEP = CELL_SIZE + GAP;

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.0;
const ZOOM_STEP = 0.15;

interface BoardProps {
	board: Record<string, PlacedCard>;
	validPlacements: ValidPlacement[];
	activeCardId: string | null;
	isDragging: boolean;
	dragRotation: Rotation;
	activeCard: CardDefinition | null;
	onPlaceTile: (x: number, y: number, rotation: Rotation) => void;
	cutTargets?: CutTarget[];
	onCut?: (x: number, y: number, direction: string) => void;
}

function parseKey(key: string): { x: number; y: number } {
	const [xs, ys] = key.split(",");
	return { x: Number(xs), y: Number(ys) };
}

function clampScale(s: number): number {
	return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

function DroppableCell({
	cellKey,
	x,
	y,
	left,
	top,
	rotations,
	rotationPicker,
	dragRotation,
	activeCard,
	onValidClick,
	onRotationSelect,
}: {
	cellKey: string;
	x: number;
	y: number;
	left: number;
	top: number;
	rotations: Rotation[];
	rotationPicker: { x: number; y: number; rotations: Rotation[] } | null;
	dragRotation: Rotation;
	activeCard: CardDefinition | null;
	onValidClick: (x: number, y: number, rotations: Rotation[]) => void;
	onRotationSelect: (rotation: Rotation) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: `drop-${x},${y}` });
	const isPickerHere = rotationPicker && rotationPicker.x === x && rotationPicker.y === y;

	return (
		<div
			ref={setNodeRef}
			key={`valid-${cellKey}`}
			className={`tapeworm-cell tapeworm-cell-valid${isPickerHere ? " tapeworm-cell-valid--active" : ""}${isOver ? " tapeworm-cell-valid--over" : ""}`}
			style={{
				left,
				top,
				width: CELL_SIZE,
				height: CELL_SIZE,
				position: "absolute",
			}}
			onClick={() => onValidClick(x, y, rotations)}
		>
			{isPickerHere ? (
				<div className="tapeworm-rotation-picker">
					{rotationPicker.rotations.map((r) => (
						<button
							key={r}
							className="tapeworm-rotation-btn"
							onClick={(e) => {
								e.stopPropagation();
								onRotationSelect(r);
							}}
						>
							{r}°
						</button>
					))}
				</div>
			) : isOver && activeCard ? (
				<CardView card={activeCard} rotation={dragRotation} size={CELL_SIZE} ghost />
			) : (
				<span className="tapeworm-cell-plus">+</span>
			)}
		</div>
	);
}

const DIRECTION_OFFSETS: Record<string, { dx: number; dy: number }> = {
	top: { dx: 0, dy: -0.5 },
	right: { dx: 0.5, dy: 0 },
	bottom: { dx: 0, dy: 0.5 },
	left: { dx: -0.5, dy: 0 },
};

export function Board({
	board,
	validPlacements,
	activeCardId,
	isDragging,
	dragRotation,
	activeCard,
	onPlaceTile,
	cutTargets,
	onCut,
}: BoardProps) {
	// ── Transform state ──
	// Live transform values live in refs (mutated directly on the DOM for 60fps).
	// React state is only used for the zoom-% label and button handlers.
	const transform = useRef({ x: 0, y: 0, scale: 1 });
	const boardRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [scaleDisplay, setScaleDisplay] = useState(1);

	const applyTransform = useCallback(() => {
		const el = boardRef.current;
		if (el) {
			const { x, y, scale } = transform.current;
			el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
		}
	}, []);

	const commitScale = useCallback(() => {
		setScaleDisplay(transform.current.scale);
	}, []);

	// ── Pan state ──
	const panningRef = useRef(false);
	const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

	// ── Pinch-zoom tracking ──
	const pointersRef = useRef(new Map<number, { x: number; y: number }>());
	const pinchStartRef = useRef<{
		dist: number;
		scale: number;
		midX: number;
		midY: number;
		ox: number;
		oy: number;
	} | null>(null);

	// Rotation picker state
	const [rotationPicker, setRotationPicker] = useState<{
		x: number;
		y: number;
		rotations: Rotation[];
	} | null>(null);

	// Compute board bounds
	const allKeys = useMemo(() => {
		const keys = Object.keys(board).map(parseKey);
		for (const vp of validPlacements) {
			keys.push({ x: vp.x, y: vp.y });
		}
		return keys;
	}, [board, validPlacements]);

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

	// Group valid placements by position
	const validByPos = useMemo(() => {
		const map = new Map<string, Rotation[]>();
		for (const vp of validPlacements) {
			const k = `${vp.x},${vp.y}`;
			const arr = map.get(k) ?? [];
			arr.push(vp.rotation);
			map.set(k, arr);
		}
		return map;
	}, [validPlacements]);

	// ── Pointer handlers: pan (1 finger) + pinch-zoom (2 fingers) ──
	// All use refs → DOM mutation, zero React re-renders during gestures.

	const isDraggingRef = useRef(isDragging);
	isDraggingRef.current = isDragging;

	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		if (isDraggingRef.current) {
			return;
		}

		pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

		if (pointersRef.current.size === 2) {
			// Second finger → start pinch, cancel pan
			panningRef.current = false;
			dragStart.current = null;

			const pts = Array.from(pointersRef.current.values());
			const dx = pts[1]!.x - pts[0]!.x;
			const dy = pts[1]!.y - pts[0]!.y;
			const dist = Math.sqrt(dx * dx + dy * dy);
			const midX = (pts[0]!.x + pts[1]!.x) / 2;
			const midY = (pts[0]!.y + pts[1]!.y) / 2;
			pinchStartRef.current = {
				dist,
				scale: transform.current.scale,
				midX,
				midY,
				ox: transform.current.x,
				oy: transform.current.y,
			};
			return;
		}

		// Single finger — start pan (skip interactive UI elements)
		if (
			(e.target as HTMLElement).closest(
				".tapeworm-cell-valid, .tapeworm-rotation-picker, .tapeworm-zoom-controls",
			)
		) {
			return;
		}

		panningRef.current = true;
		dragStart.current = {
			x: e.clientX,
			y: e.clientY,
			ox: transform.current.x,
			oy: transform.current.y,
		};
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}, []);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

			// Pinch zoom (2 fingers)
			if (pointersRef.current.size === 2 && pinchStartRef.current) {
				const pts = Array.from(pointersRef.current.values());
				const dx = pts[1]!.x - pts[0]!.x;
				const dy = pts[1]!.y - pts[0]!.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const pinch = pinchStartRef.current;

				const newScale = clampScale(pinch.scale * (dist / pinch.dist));
				const midX = (pts[0]!.x + pts[1]!.x) / 2;
				const midY = (pts[0]!.y + pts[1]!.y) / 2;

				transform.current.scale = newScale;
				transform.current.x = pinch.ox + (midX - pinch.midX);
				transform.current.y = pinch.oy + (midY - pinch.midY);
				applyTransform();
				return;
			}

			// Single-finger pan
			if (!panningRef.current || !dragStart.current) {
				return;
			}
			transform.current.x = dragStart.current.ox + (e.clientX - dragStart.current.x);
			transform.current.y = dragStart.current.oy + (e.clientY - dragStart.current.y);
			applyTransform();
		},
		[applyTransform],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			pointersRef.current.delete(e.pointerId);
			if (pointersRef.current.size < 2) {
				if (pinchStartRef.current) {
					pinchStartRef.current = null;
					commitScale();
				}
			}
			if (pointersRef.current.size === 0) {
				panningRef.current = false;
				dragStart.current = null;
			}
		},
		[commitScale],
	);

	// ── Mouse wheel zoom (non-passive to preventDefault) ──

	useEffect(() => {
		const el = containerRef.current;
		if (!el) {
			return;
		}

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault();
			e.stopPropagation();

			if (isDraggingRef.current) {
				return;
			}

			const rect = el.getBoundingClientRect();
			const cursorX = e.clientX - rect.left - rect.width / 2;
			const cursorY = e.clientY - rect.top - rect.height / 2;

			const zoomIntensity = 0.002;
			const delta = -e.deltaY * zoomIntensity;
			const oldScale = transform.current.scale;
			const newScale = clampScale(oldScale * (1 + delta));
			const factor = newScale / oldScale;

			transform.current.scale = newScale;
			transform.current.x = cursorX + factor * (transform.current.x - cursorX);
			transform.current.y = cursorY + factor * (transform.current.y - cursorY);
			applyTransform();
			commitScale();
		};

		el.addEventListener("wheel", handleWheel, { passive: false });
		return () => el.removeEventListener("wheel", handleWheel);
	}, [applyTransform, commitScale]);

	// ── Zoom button handlers ──

	const zoomIn = useCallback(() => {
		transform.current.scale = clampScale(transform.current.scale + ZOOM_STEP);
		applyTransform();
		commitScale();
	}, [applyTransform, commitScale]);

	const zoomOut = useCallback(() => {
		transform.current.scale = clampScale(transform.current.scale - ZOOM_STEP);
		applyTransform();
		commitScale();
	}, [applyTransform, commitScale]);

	const zoomReset = useCallback(() => {
		transform.current = { x: 0, y: 0, scale: 1 };
		applyTransform();
		commitScale();
	}, [applyTransform, commitScale]);

	const handleValidClick = useCallback(
		(x: number, y: number, rotations: Rotation[]) => {
			if (rotations.includes(dragRotation)) {
				onPlaceTile(x, y, dragRotation);
				setRotationPicker(null);
			} else if (rotations.length === 1) {
				onPlaceTile(x, y, rotations[0]!);
				setRotationPicker(null);
			} else {
				setRotationPicker({ x, y, rotations });
			}
		},
		[onPlaceTile, dragRotation],
	);

	const handleRotationSelect = useCallback(
		(rotation: Rotation) => {
			if (!rotationPicker) {
				return;
			}
			onPlaceTile(rotationPicker.x, rotationPicker.y, rotation);
			setRotationPicker(null);
		},
		[rotationPicker, onPlaceTile],
	);

	const boardWidth = (bounds.maxX - bounds.minX + 1) * CELL_STEP;
	const boardHeight = (bounds.maxY - bounds.minY + 1) * CELL_STEP;

	const showValidCells = !!activeCardId && !cutTargets?.length;
	const showCutTargets = !!(cutTargets?.length && onCut);

	return (
		<div
			ref={containerRef}
			className="tapeworm-board-container"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
		>
			<div
				ref={boardRef}
				className="tapeworm-board"
				style={{
					width: boardWidth,
					height: boardHeight,
					position: "relative",
					willChange: "transform",
				}}
			>
				{/* Placed cards */}
				{Object.entries(board).map(([key, placed]) => {
					const { x, y } = parseKey(key);
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
								opacity: showCutTargets ? 0.6 : 1,
							}}
						>
							<CardView card={placed.card} rotation={placed.rotation} size={CELL_SIZE} />
						</div>
					);
				})}

				{/* Valid placement cells */}
				{showValidCells &&
					Array.from(validByPos.entries()).map(([key, rotations]) => {
						const { x, y } = parseKey(key);
						const left = (x - bounds.minX) * CELL_STEP;
						const top = (y - bounds.minY) * CELL_STEP;
						return (
							<DroppableCell
								key={`valid-${key}`}
								cellKey={key}
								x={x}
								y={y}
								left={left}
								top={top}
								rotations={rotations}
								rotationPicker={rotationPicker}
								dragRotation={dragRotation}
								activeCard={activeCard}
								onValidClick={handleValidClick}
								onRotationSelect={handleRotationSelect}
							/>
						);
					})}

				{/* Cut target markers */}
				{showCutTargets &&
					cutTargets.map((ct) => {
						const offsets = DIRECTION_OFFSETS[ct.direction]!;
						const cx = ct.x + offsets.dx;
						const cy = ct.y + offsets.dy;
						const left = (cx - bounds.minX) * CELL_STEP + CELL_SIZE / 2 - 14;
						const top = (cy - bounds.minY) * CELL_STEP + CELL_SIZE / 2 - 14;
						return (
							<button
								key={`cut-${ct.x}-${ct.y}-${ct.direction}`}
								className="tapeworm-cut-target"
								style={{ left, top, position: "absolute" }}
								onClick={() => onCut(ct.x, ct.y, ct.direction)}
								title={`Разрезать (${ct.color})`}
							>
								✂️
							</button>
						);
					})}
			</div>

			{/* Zoom controls */}
			<div className="tapeworm-zoom-controls">
				<button className="tapeworm-zoom-btn" onClick={zoomIn}>
					+
				</button>
				<button className="tapeworm-zoom-btn" onClick={zoomReset}>
					{Math.round(scaleDisplay * 100)}%
				</button>
				<button className="tapeworm-zoom-btn" onClick={zoomOut}>
					−
				</button>
			</div>
		</div>
	);
}
