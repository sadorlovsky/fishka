import { useDroppable } from "@dnd-kit/core";
import { useCallback, useMemo, useRef, useState } from "react";
import type { CardDefinition, PlacedCard, Rotation, ValidPlacement } from "@/shared/types/tapeworm";
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

export function Board({
	board,
	validPlacements,
	activeCardId,
	isDragging,
	dragRotation,
	activeCard,
	onPlaceTile,
}: BoardProps) {
	// Pan + zoom state
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [scale, setScale] = useState(1);
	const [panning, setPanning] = useState(false);
	const dragStart = useRef<{
		x: number;
		y: number;
		ox: number;
		oy: number;
	} | null>(null);

	// Pinch-zoom tracking
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

	// Container ref for coordinate calculations
	const containerRef = useRef<HTMLDivElement>(null);

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

	// --- Pointer handlers: pan (1 finger) + pinch-zoom (2 fingers) ---

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (isDragging) {
				return;
			}

			pointersRef.current.set(e.pointerId, {
				x: e.clientX,
				y: e.clientY,
			});

			if (pointersRef.current.size === 2) {
				// Second finger down — start pinch, cancel any pan
				setPanning(false);
				dragStart.current = null;

				const pts = Array.from(pointersRef.current.values());
				const dx = pts[1]!.x - pts[0]!.x;
				const dy = pts[1]!.y - pts[0]!.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const midX = (pts[0]!.x + pts[1]!.x) / 2;
				const midY = (pts[0]!.y + pts[1]!.y) / 2;
				pinchStartRef.current = {
					dist,
					scale,
					midX,
					midY,
					ox: offset.x,
					oy: offset.y,
				};
				return;
			}

			// Single finger — start pan (skip if on interactive elements)
			if (
				(e.target as HTMLElement).closest(
					".tapeworm-cell-card, .tapeworm-cell-valid, .tapeworm-rotation-picker, .tapeworm-zoom-controls",
				)
			) {
				return;
			}

			setPanning(true);
			dragStart.current = {
				x: e.clientX,
				y: e.clientY,
				ox: offset.x,
				oy: offset.y,
			};
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		},
		[offset, scale, isDragging],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			pointersRef.current.set(e.pointerId, {
				x: e.clientX,
				y: e.clientY,
			});

			// Pinch zoom (2 fingers)
			if (pointersRef.current.size === 2 && pinchStartRef.current) {
				const pts = Array.from(pointersRef.current.values());
				const dx = pts[1]!.x - pts[0]!.x;
				const dy = pts[1]!.y - pts[0]!.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const pinch = pinchStartRef.current;

				const newScale = clampScale(pinch.scale * (dist / pinch.dist));

				// Pan so that the midpoint stays fixed
				const midX = (pts[0]!.x + pts[1]!.x) / 2;
				const midY = (pts[0]!.y + pts[1]!.y) / 2;
				const dmx = midX - pinch.midX;
				const dmy = midY - pinch.midY;

				setScale(newScale);
				setOffset({
					x: pinch.ox + dmx,
					y: pinch.oy + dmy,
				});
				return;
			}

			// Single-finger pan
			if (!panning || !dragStart.current) {
				return;
			}
			const dx2 = e.clientX - dragStart.current.x;
			const dy2 = e.clientY - dragStart.current.y;
			setOffset({
				x: dragStart.current.ox + dx2,
				y: dragStart.current.oy + dy2,
			});
		},
		[panning],
	);

	const handlePointerUp = useCallback((e: React.PointerEvent) => {
		pointersRef.current.delete(e.pointerId);
		if (pointersRef.current.size < 2) {
			pinchStartRef.current = null;
		}
		if (pointersRef.current.size === 0) {
			setPanning(false);
			dragStart.current = null;
		}
	}, []);

	// Mouse wheel zoom
	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			if (isDragging) {
				return;
			}
			e.stopPropagation();

			const rect = containerRef.current?.getBoundingClientRect();
			if (!rect) {
				return;
			}

			// Zoom centered on cursor position
			const cursorX = e.clientX - rect.left - rect.width / 2;
			const cursorY = e.clientY - rect.top - rect.height / 2;

			const direction = e.deltaY > 0 ? -1 : 1;
			const newScale = clampScale(scale + direction * ZOOM_STEP);
			const factor = newScale / scale;

			setScale(newScale);
			setOffset({
				x: cursorX + factor * (offset.x - cursorX),
				y: cursorY + factor * (offset.y - cursorY),
			});
		},
		[scale, offset, isDragging],
	);

	// Zoom button handlers
	const zoomIn = useCallback(() => {
		setScale((s) => clampScale(s + ZOOM_STEP));
	}, []);

	const zoomOut = useCallback(() => {
		setScale((s) => clampScale(s - ZOOM_STEP));
	}, []);

	const zoomReset = useCallback(() => {
		setScale(1);
		setOffset({ x: 0, y: 0 });
	}, []);

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

	const showValidCells = !!activeCardId;

	return (
		<div
			ref={containerRef}
			className="tapeworm-board-container"
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerCancel={handlePointerUp}
			onWheel={handleWheel}
		>
			<div
				className="tapeworm-board"
				style={{
					width: boardWidth,
					height: boardHeight,
					transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
					position: "relative",
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
			</div>

			{/* Zoom controls */}
			<div className="tapeworm-zoom-controls">
				<button className="tapeworm-zoom-btn" onClick={zoomIn}>
					+
				</button>
				<button className="tapeworm-zoom-btn" onClick={zoomReset}>
					{Math.round(scale * 100)}%
				</button>
				<button className="tapeworm-zoom-btn" onClick={zoomOut}>
					−
				</button>
			</div>
		</div>
	);
}
