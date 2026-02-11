import { useCallback, useEffect, useRef, useState } from "react";
import {
	HEARTBEAT_INTERVAL,
	WS_RECONNECT_BASE_DELAY,
	WS_RECONNECT_MAX_DELAY,
} from "@/shared/constants";
import type { ClientMessage, ServerMessage } from "@/shared/types/protocol";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketOptions {
	onMessage: (msg: ServerMessage) => void;
}

export function useWebSocket({ onMessage }: UseWebSocketOptions) {
	const wsRef = useRef<WebSocket | null>(null);
	const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttemptRef = useRef(0);
	const onMessageRef = useRef(onMessage);
	onMessageRef.current = onMessage;

	const [status, setStatus] = useState<ConnectionStatus>("disconnected");

	const getWsUrl = useCallback(() => {
		const proto = location.protocol === "https:" ? "wss:" : "ws:";
		return `${proto}//${location.host}/ws`;
	}, []);

	const stopHeartbeat = useCallback(() => {
		if (heartbeatRef.current) {
			clearInterval(heartbeatRef.current);
			heartbeatRef.current = null;
		}
	}, []);

	const startHeartbeat = useCallback(() => {
		stopHeartbeat();
		heartbeatRef.current = setInterval(() => {
			if (wsRef.current?.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify({ type: "heartbeat" }));
			}
		}, HEARTBEAT_INTERVAL);
	}, [stopHeartbeat]);

	const send = useCallback((msg: ClientMessage) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(JSON.stringify(msg));
		}
	}, []);

	const connect = useCallback(() => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			return;
		}

		setStatus("connecting");
		const ws = new WebSocket(getWsUrl());

		ws.onopen = () => {
			setStatus("connected");
			reconnectAttemptRef.current = 0;
			startHeartbeat();
		};

		ws.onmessage = (event) => {
			try {
				const msg: ServerMessage = JSON.parse(event.data);

				if (msg.type === "connected") {
					localStorage.setItem("sessionToken", msg.sessionToken);
				}

				onMessageRef.current(msg);
			} catch {
				// ignore malformed messages
			}
		};

		ws.onclose = () => {
			setStatus("disconnected");
			stopHeartbeat();
			wsRef.current = null;

			const delay = Math.min(
				WS_RECONNECT_BASE_DELAY * 2 ** reconnectAttemptRef.current,
				WS_RECONNECT_MAX_DELAY,
			);
			reconnectAttemptRef.current++;
			reconnectTimeoutRef.current = setTimeout(connect, delay);
		};

		ws.onerror = () => {
			ws.close();
		};

		wsRef.current = ws;
	}, [getWsUrl, startHeartbeat, stopHeartbeat]);

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}
		stopHeartbeat();
		reconnectAttemptRef.current = 0;
		if (wsRef.current) {
			wsRef.current.onclose = null;
			wsRef.current.close();
			wsRef.current = null;
		}
		setStatus("disconnected");
	}, [stopHeartbeat]);

	useEffect(() => {
		return () => {
			disconnect();
		};
	}, [disconnect]);

	return { status, send, connect, disconnect };
}
