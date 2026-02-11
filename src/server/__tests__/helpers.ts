import type { ServerWebSocket } from "bun";
import type { WSData } from "../ws/connection";

export function createMockWs(overrides?: Partial<WSData>): ServerWebSocket<WSData> {
	const ws = {
		data: {
			playerId: null,
			sessionToken: null,
			...overrides,
		} as WSData,
		send: () => 0,
		subscribe: () => {},
		unsubscribe: () => {},
		publish: () => 0,
		close: () => {},
		isSubscribed: () => false,
		cork: (cb: () => void) => cb(),
		remoteAddress: "127.0.0.1",
		readyState: 1,
		binaryType: "arraybuffer" as const,
		ping: () => {},
		pong: () => {},
	};
	return ws as unknown as ServerWebSocket<WSData>;
}
