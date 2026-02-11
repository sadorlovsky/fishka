import { useEffect, useState } from "react";
import "./Timer.css";

interface TimerProps {
	endsAt: number;
	onExpired?: () => void;
}

export function Timer({ endsAt, onExpired }: TimerProps) {
	const [secondsLeft, setSecondsLeft] = useState(() =>
		Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
	);

	useEffect(() => {
		const tick = () => {
			const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
			setSecondsLeft(left);
			if (left <= 0) {
				onExpired?.();
			}
		};

		tick();
		const interval = setInterval(tick, 250);
		return () => clearInterval(interval);
	}, [endsAt, onExpired]);

	const isUrgent = secondsLeft <= 10;

	return (
		<div className={`timer${isUrgent ? " timer--urgent" : ""}`}>
			<span className="timer-value">{secondsLeft}</span>
			<span className="timer-label">сек</span>
		</div>
	);
}
