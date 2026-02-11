import { useEffect, useState } from "react";
import type { CrocodilePlayerView } from "@/shared/types/crocodile";
import { Avatar } from "../../components/Avatar";

interface StartingOverlayProps {
	state: CrocodilePlayerView;
}

export function StartingOverlay({ state }: StartingOverlayProps) {
	const [secondsLeft, setSecondsLeft] = useState(() =>
		Math.max(1, Math.ceil((state.timerEndsAt - Date.now()) / 1000)),
	);

	useEffect(() => {
		const interval = setInterval(() => {
			const left = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
			setSecondsLeft(left);
			if (left <= 0) {
				clearInterval(interval);
			}
		}, 250);
		return () => clearInterval(interval);
	}, [state.timerEndsAt]);

	const shower = state.players.find((p) => p.id === state.currentShowerId);
	const isFirstRound = state.currentRound === 1;

	return (
		<div className="starting-overlay">
			<p className="starting-overlay-title">
				{isFirstRound ? "Игра начинается!" : `Раунд ${state.currentRound}`}
			</p>
			{shower && (
				<div className="starting-overlay-explainer">
					<Avatar seed={shower.avatarSeed} />
					<p className="starting-overlay-explainer-text">
						{state.isShower ? "Вы показываете" : `${shower.name} показывает`}
					</p>
				</div>
			)}
			<p className="starting-overlay-countdown">{secondsLeft}</p>
		</div>
	);
}
