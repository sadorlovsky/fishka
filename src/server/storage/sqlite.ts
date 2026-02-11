import { Database } from "bun:sqlite";

const db = new Database("data/games.db", { create: true });

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

export function initDatabase(): void {
	db.run(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      language TEXT NOT NULL DEFAULT 'ru',
      category TEXT,
      difficulty INTEGER DEFAULT 1
    )
  `);

	db.run(`
    CREATE TABLE IF NOT EXISTS room_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      game_id TEXT NOT NULL,
      players_json TEXT NOT NULL,
      result_json TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER
    )
  `);

	db.run(`
    CREATE INDEX IF NOT EXISTS idx_words_language ON words(language)
  `);
}

// --- Words ---

export function getRandomWord(language: string = "ru"): string | null {
	const row = db
		.query<{ word: string }, [string]>(
			"SELECT word FROM words WHERE language = ? ORDER BY RANDOM() LIMIT 1",
		)
		.get(language);
	return row?.word ?? null;
}

export function getRandomWordByDifficulty(
	language: string = "ru",
	difficulty: number | null = null,
): string | null {
	if (difficulty === null) {
		return getRandomWord(language);
	}
	const row = db
		.query<{ word: string }, [string, number]>(
			"SELECT word FROM words WHERE language = ? AND difficulty = ? ORDER BY RANDOM() LIMIT 1",
		)
		.get(language, difficulty);
	return row?.word ?? null;
}

export function getRandomWords(count: number, language: string = "ru"): string[] {
	const rows = db
		.query<{ word: string }, [string, number]>(
			"SELECT word FROM words WHERE language = ? ORDER BY RANDOM() LIMIT ?",
		)
		.all(language, count);
	return rows.map((r) => r.word);
}

export function insertWords(
	words: {
		word: string;
		language?: string;
		category?: string;
		difficulty?: number;
	}[],
): void {
	const stmt = db.prepare(
		"INSERT OR IGNORE INTO words (word, language, category, difficulty) VALUES (?, ?, ?, ?)",
	);
	const transaction = db.transaction(() => {
		for (const w of words) {
			stmt.run(w.word, w.language ?? "ru", w.category ?? null, w.difficulty ?? 1);
		}
	});
	transaction();
}

export function getWordCount(language: string = "ru"): number {
	const row = db
		.query<{ count: number }, [string]>("SELECT COUNT(*) as count FROM words WHERE language = ?")
		.get(language);
	return row?.count ?? 0;
}

// --- Room History ---

export function saveRoomHistory(data: {
	roomCode: string;
	gameId: string;
	players: unknown[];
	result?: unknown;
	startedAt: number;
	finishedAt?: number;
}): void {
	db.run(
		`INSERT INTO room_history (room_code, game_id, players_json, result_json, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
		[
			data.roomCode,
			data.gameId,
			JSON.stringify(data.players),
			data.result ? JSON.stringify(data.result) : null,
			data.startedAt,
			data.finishedAt ?? null,
		],
	);
}

export { db };
