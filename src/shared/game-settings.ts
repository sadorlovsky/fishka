import type { WordGuessDifficulty } from "./types/word-guess";

export function getRecommendedSettings(
	playerCount: number,
	_difficulty: WordGuessDifficulty,
): { roundTimeSeconds: number; cycles: number } {
	const roundTimeSeconds = 60;
	const cycles = Math.max(1, Math.min(3, Math.round(10 / playerCount)));

	return { roundTimeSeconds, cycles };
}
