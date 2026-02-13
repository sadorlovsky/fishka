export function normalizeWord(word: string): string {
	return word.trim().toLowerCase().replace(/ё/g, "е");
}

export function wordsMatch(guess: string, target: string): boolean {
	return normalizeWord(guess) === normalizeWord(target);
}
