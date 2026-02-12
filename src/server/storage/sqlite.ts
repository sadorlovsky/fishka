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
    CREATE TABLE IF NOT EXISTS sessions (
      player_id TEXT PRIMARY KEY,
      session_token TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      avatar_seed INTEGER NOT NULL,
      room_code TEXT,
      is_spectator INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

	db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      host_id TEXT NOT NULL,
      player_ids_json TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      game_state_json TEXT,
      pause_info_json TEXT,
      created_at INTEGER NOT NULL
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

// --- Sessions ---

// Lazy-init: prepared statements are created after initDatabase() creates tables
let _upsertSessionStmt: ReturnType<typeof db.prepare> | null = null;
let _deleteSessionStmt: ReturnType<typeof db.prepare> | null = null;
let _updateSessionRoomStmt: ReturnType<typeof db.prepare> | null = null;
let _upsertRoomStmt: ReturnType<typeof db.prepare> | null = null;
let _deleteRoomStmt: ReturnType<typeof db.prepare> | null = null;
let _updateRoomGameStateStmt: ReturnType<typeof db.prepare> | null = null;
let _updateRoomPlayersStmt: ReturnType<typeof db.prepare> | null = null;
let _updateRoomSettingsStmt: ReturnType<typeof db.prepare> | null = null;
let _updateRoomPauseStmt: ReturnType<typeof db.prepare> | null = null;

function stmts() {
	if (!_upsertSessionStmt) {
		initDatabase();
		_upsertSessionStmt = db.prepare(
			`INSERT OR REPLACE INTO sessions (player_id, session_token, name, avatar_seed, room_code, is_spectator, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		);
		_deleteSessionStmt = db.prepare("DELETE FROM sessions WHERE player_id = ?");
		_updateSessionRoomStmt = db.prepare("UPDATE sessions SET room_code = ? WHERE player_id = ?");
		_upsertRoomStmt = db.prepare(
			`INSERT OR REPLACE INTO rooms (code, status, host_id, player_ids_json, settings_json, game_state_json, pause_info_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		);
		_deleteRoomStmt = db.prepare("DELETE FROM rooms WHERE code = ?");
		_updateRoomGameStateStmt = db.prepare(
			"UPDATE rooms SET game_state_json = ?, status = ? WHERE code = ?",
		);
		_updateRoomPlayersStmt = db.prepare(
			"UPDATE rooms SET player_ids_json = ?, host_id = ? WHERE code = ?",
		);
		_updateRoomSettingsStmt = db.prepare("UPDATE rooms SET settings_json = ? WHERE code = ?");
		_updateRoomPauseStmt = db.prepare("UPDATE rooms SET pause_info_json = ? WHERE code = ?");
	}
	return {
		upsertSession: _upsertSessionStmt!,
		deleteSession: _deleteSessionStmt!,
		updateSessionRoom: _updateSessionRoomStmt!,
		upsertRoom: _upsertRoomStmt!,
		deleteRoom: _deleteRoomStmt!,
		updateRoomGameState: _updateRoomGameStateStmt!,
		updateRoomPlayers: _updateRoomPlayersStmt!,
		updateRoomSettings: _updateRoomSettingsStmt!,
		updateRoomPause: _updateRoomPauseStmt!,
	};
}

export function persistSession(data: {
	playerId: string;
	sessionToken: string;
	name: string;
	avatarSeed: number;
	roomCode: string | null;
	isSpectator: boolean;
	createdAt: number;
}): void {
	stmts().upsertSession.run(
		data.playerId,
		data.sessionToken,
		data.name,
		data.avatarSeed,
		data.roomCode,
		data.isSpectator ? 1 : 0,
		data.createdAt,
	);
}

export function deleteSession(playerId: string): void {
	stmts().deleteSession.run(playerId);
}

export function updateSessionRoom(playerId: string, roomCode: string | null): void {
	stmts().updateSessionRoom.run(roomCode, playerId);
}

interface SessionRow {
	player_id: string;
	session_token: string;
	name: string;
	avatar_seed: number;
	room_code: string | null;
	is_spectator: number;
	created_at: number;
}

export function loadAllSessions(): SessionRow[] {
	return db.query<SessionRow, []>("SELECT * FROM sessions").all();
}

// --- Rooms ---

export function persistRoom(data: {
	code: string;
	status: string;
	hostId: string;
	playerIds: string[];
	settings: unknown;
	gameState: unknown | null;
	pauseInfo: unknown | null;
	createdAt: number;
}): void {
	stmts().upsertRoom.run(
		data.code,
		data.status,
		data.hostId,
		JSON.stringify(data.playerIds),
		JSON.stringify(data.settings),
		data.gameState != null ? JSON.stringify(data.gameState) : null,
		data.pauseInfo != null ? JSON.stringify(data.pauseInfo) : null,
		data.createdAt,
	);
}

export function deletePersistedRoom(code: string): void {
	stmts().deleteRoom.run(code);
}

export function updatePersistedGameState(
	code: string,
	status: string,
	gameState: unknown | null,
): void {
	stmts().updateRoomGameState.run(
		gameState != null ? JSON.stringify(gameState) : null,
		status,
		code,
	);
}

export function updatePersistedRoomPlayers(
	code: string,
	playerIds: string[],
	hostId: string,
): void {
	stmts().updateRoomPlayers.run(JSON.stringify(playerIds), hostId, code);
}

export function updatePersistedRoomSettings(code: string, settings: unknown): void {
	stmts().updateRoomSettings.run(JSON.stringify(settings), code);
}

export function updatePersistedPauseInfo(code: string, pauseInfo: unknown | null): void {
	stmts().updateRoomPause.run(pauseInfo != null ? JSON.stringify(pauseInfo) : null, code);
}

interface RoomRow {
	code: string;
	status: string;
	host_id: string;
	player_ids_json: string;
	settings_json: string;
	game_state_json: string | null;
	pause_info_json: string | null;
	created_at: number;
}

export function loadAllRooms(): RoomRow[] {
	return db.query<RoomRow, []>("SELECT * FROM rooms").all();
}

export { db };
