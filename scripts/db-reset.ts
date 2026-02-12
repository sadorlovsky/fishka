import { Database } from "bun:sqlite";

const dbPath = "data/games.db";
const file = Bun.file(dbPath);

if (!(await file.exists())) {
	console.log("No database found at", dbPath);
	process.exit(0);
}

const db = new Database(dbPath);

const sessions = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM sessions").get();
const rooms = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM rooms").get();

db.run("DELETE FROM sessions");
db.run("DELETE FROM rooms");

console.log(`Cleared ${sessions?.count ?? 0} sessions and ${rooms?.count ?? 0} rooms`);
console.log("Words table preserved");

db.close();
