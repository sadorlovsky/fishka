import { useEffect, useState } from "react";
import type { WordGuessPlayerView } from "@/shared/types/word-guess";
import { Avatar } from "../../components/Avatar";
import "./StartingOverlay.css";

interface StartingOverlayProps {
	state: WordGuessPlayerView;
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

	const explainer = state.players.find((p) => p.id === state.currentExplainerId);
	const isFirstRound = state.currentRound === 1;

	return (
		<div className="starting-overlay">
			<p className="starting-overlay-title">
				{isFirstRound ? "Игра начинается!" : `Раунд ${state.currentRound}`}
			</p>
			{explainer && (
				<div className="starting-overlay-explainer">
					<Avatar seed={explainer.avatarSeed} />
					<p className="starting-overlay-explainer-text">
						{state.isExplainer ? "Вы объясняете" : `${explainer.name} объясняет`}
					</p>
				</div>
			)}
			<p className="starting-overlay-countdown">{secondsLeft}</p>
		</div>
	);
}
