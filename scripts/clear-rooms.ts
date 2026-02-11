import { RedisClient } from "bun";

const redis = new RedisClient();

async function clearKeys(pattern: string): Promise<number> {
	const keys = await redis.keys(pattern);
	if (keys.length === 0) return 0;
	for (const key of keys) {
		await redis.del(key);
	}
	return keys.length;
}

const rooms = await clearKeys("room:*");
const games = await clearKeys("game:*");
const sessions = await clearKeys("session:*");

console.log(`Cleared ${rooms} room(s), ${games} game state(s), ${sessions} session(s)`);

process.exit(0);
