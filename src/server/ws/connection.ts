import type { ServerWebSocket } from "bun";
import type { ClientMessage, ServerMessage } from "@/shared/types/protocol";

export interface WSData {
	playerId: string | null;
	sessionToken: string | null;
}

export function parseMessage(raw: string | Buffer): ClientMessage | null {
	try {
		const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
		const msg = JSON.parse(text);
		if (!msg || typeof msg.type !== "string") {
			return null;
		}
		return msg as ClientMessage;
	} catch {
		return null;
	}
}

export function send(ws: ServerWebSocket<WSData>, msg: ServerMessage): void {
	ws.send(JSON.stringify(msg));
}

export function sendError(ws: ServerWebSocket<WSData>, code: string, message: string): void {
	send(ws, { type: "error", code, message });
}
