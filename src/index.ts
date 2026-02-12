import index from "./index.html";
import { crocodilePlugin } from "./server/games/plugins/crocodile/plugin";
import { tapewormPlugin } from "./server/games/plugins/tapeworm/plugin";
import { wordGuessPlugin } from "./server/games/plugins/word-guess/plugin";
import { seedWords } from "./server/games/plugins/word-guess/words";
import { registerPlugin } from "./server/games/registry";
import { initDatabase } from "./server/storage/sqlite";
import type { WSData } from "./server/ws/connection";
import { handleClose, handleMessage, handleOpen } from "./server/ws/handler";

// Initialize storage
initDatabase();
seedWords();

// Register game plugins
registerPlugin(wordGuessPlugin);
registerPlugin(tapewormPlugin);
registerPlugin(crocodilePlugin);

// Start room cleanup, player sweep, and rate limit cleanup
import { playerManager } from "./server/rooms/player-manager";
import { roomManager } from "./server/rooms/room-manager";
import { connectRateLimiter, gameActionRateLimiter, joinRateLimiter } from "./server/ws/rate-limit";

roomManager.startCleanup();
playerManager.startSweep();
connectRateLimiter.startSweep();
joinRateLimiter.startSweep();
gameActionRateLimiter.startSweep();

const server = Bun.serve({
	port: Number(process.env.PORT) || 3000,
	hostname: "0.0.0.0",
	routes: {
		"/*": index,
	},

	fetch(req, server) {
		const url = new URL(req.url);

		if (url.pathname === "/ws") {
			// Reject cross-origin WebSocket connections
			const origin = req.headers.get("origin");
			if (origin) {
				const host = req.headers.get("host");
				try {
					const originHost = new URL(origin).host;
					if (host && originHost !== host) {
						console.warn(`[security] origin rejected: origin=${origin} host=${host}`);
						return new Response("Forbidden", { status: 403 });
					}
				} catch {
					console.warn(`[security] malformed origin: origin=${origin}`);
					return new Response("Forbidden", { status: 403 });
				}
			}

			const success = server.upgrade(req, {
				data: {
					playerId: null,
					sessionToken: null,
				} satisfies WSData,
			});
			if (success) {
				return undefined;
			}
			return new Response("WebSocket upgrade failed", { status: 400 });
		}

		return new Response("Not found", { status: 404 });
	},

	websocket: {
		open: handleOpen,
		message: handleMessage,
		close: handleClose,
		idleTimeout: 120,
		maxPayloadLength: 64 * 1024,
	},

	development: process.env.NODE_ENV !== "production" && {
		hmr: true,
		console: true,
	},
});

import { networkInterfaces } from "node:os";

const port = server.port;
const addresses: string[] = [`  http://localhost:${port}`];

for (const [name, nets] of Object.entries(networkInterfaces())) {
	if (!nets) {
		continue;
	}
	for (const net of nets) {
		if (net.family !== "IPv4" || net.internal) {
			continue;
		}
		const label =
			name.startsWith("utun") || net.address.startsWith("100.") ? "tailscale" : "local network";
		addresses.push(`  http://${net.address}:${port} (${label})`);
	}
}

console.log(`\nServer running on:\n${addresses.join("\n")}\n`);
