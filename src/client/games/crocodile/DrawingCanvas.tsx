import { useCallback, useEffect, useRef } from "react";

interface DrawingCanvasProps {
	readonly?: boolean;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function DrawingCanvas({ readonly = false }: DrawingCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isDrawing = useRef(false);

	const getCtx = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return null;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return null;
		}
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 3;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		return ctx;
	}, []);

	const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return { x: 0, y: 0 };
		}
		const rect = canvas.getBoundingClientRect();
		return {
			x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
			y: ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
		};
	}, []);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (readonly) {
				return;
			}
			const ctx = getCtx();
			if (!ctx) {
				return;
			}
			isDrawing.current = true;
			const pos = getPos(e);
			ctx.beginPath();
			ctx.moveTo(pos.x, pos.y);
			(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
		},
		[readonly, getCtx, getPos],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLCanvasElement>) => {
			if (readonly || !isDrawing.current) {
				return;
			}
			const ctx = getCtx();
			if (!ctx) {
				return;
			}
			const pos = getPos(e);
			ctx.lineTo(pos.x, pos.y);
			ctx.stroke();
		},
		[readonly, getCtx, getPos],
	);

	const handlePointerUp = useCallback(() => {
		isDrawing.current = false;
	}, []);

	const handleClear = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}
		ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}, []);

	return (
		<div className="crocodile-canvas-container">
			<canvas
				ref={canvasRef}
				className={`crocodile-canvas${readonly ? " crocodile-canvas--readonly" : ""}`}
				width={CANVAS_WIDTH}
				height={CANVAS_HEIGHT}
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerLeave={handlePointerUp}
			/>
			{!readonly && (
				<button type="button" className="btn crocodile-canvas-clear" onClick={handleClear}>
					Очистить
				</button>
			)}
		</div>
	);
}
