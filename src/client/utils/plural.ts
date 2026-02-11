/**
 * Russian pluralization: picks the correct form based on number.
 * plural(5, "карта", "карты", "карт") → "5 карт"
 */
export function plural(n: number, one: string, few: string, many: string): string {
	return `${n} ${pluralWord(n, one, few, many)}`;
}

/**
 * Returns just the word form without the number.
 * pluralWord(5, "карта", "карты", "карт") → "карт"
 */
export function pluralWord(n: number, one: string, few: string, many: string): string {
	const abs = Math.abs(n);
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod100 >= 11 && mod100 <= 19) {
		return many;
	}
	if (mod10 === 1) {
		return one;
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return few;
	}
	return many;
}
