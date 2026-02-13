import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatBroadcastMessage } from "@/shared/types/protocol";
import { useConnection } from "../contexts/ConnectionContext";
import "./ChatOverlay.css";

interface ChatEntry {
	id: number;
	playerId: string;
	playerName: string;
	text: string;
	fading: boolean;
}

let nextId = 0;

export function ChatOverlay() {
	const { send, onChatMessage, room } = useConnection();
	const [messages, setMessages] = useState<ChatEntry[]>([]);
	const [text, setText] = useState("");
	const [open, setOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

	const scheduleRemoval = useCallback((id: number) => {
		const fadeTimer = setTimeout(() => {
			setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, fading: true } : m)));
		}, 4500);

		const removeTimer = setTimeout(() => {
			setMessages((prev) => prev.filter((m) => m.id !== id));
			timersRef.current.delete(id);
		}, 5000);

		timersRef.current.set(id, fadeTimer);
		timersRef.current.set(-id - 1, removeTimer);
	}, []);

	useEffect(() => {
		const unsub = onChatMessage((msg: ChatBroadcastMessage) => {
			const id = nextId++;
			setMessages((prev) => {
				const next = [
					...prev,
					{
						id,
						playerId: msg.playerId,
						playerName: msg.playerName,
						text: msg.text,
						fading: false,
					},
				];
				return next.length > 20 ? next.slice(-20) : next;
			});
			scheduleRemoval(id);
		});
		return unsub;
	}, [onChatMessage, scheduleRemoval]);

	useEffect(() => {
		const timers = timersRef.current;
		return () => {
			for (const t of timers.values()) {
				clearTimeout(t);
			}
		};
	}, []);

	// Focus input when opened
	useEffect(() => {
		if (open) {
			inputRef.current?.focus();
		}
	}, [open]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = text.trim();
		if (!trimmed) {
			return;
		}
		send({ type: "chatMessage", text: trimmed });
		setText("");
	};

	const handleBlur = () => {
		if (!text.trim()) {
			setOpen(false);
		}
	};

	const getPlayerColor = (playerId: string): string => {
		const player = room?.players.find((p) => p.id === playerId);
		if (!player) {
			return "hsl(0, 0%, 60%)";
		}
		const hue = player.avatarSeed % 360;
		return `hsl(${hue}, 70%, 60%)`;
	};

	return (
		<div className="chat-overlay">
			<div className="chat-messages">
				{messages.map((msg) => (
					<div key={msg.id} className={`chat-bubble${msg.fading ? " chat-bubble--fading" : ""}`}>
						<span className="chat-bubble-name" style={{ color: getPlayerColor(msg.playerId) }}>
							{msg.playerName}
						</span>
						<span className="chat-bubble-text">{msg.text}</span>
					</div>
				))}
			</div>
			{open ? (
				<form className="chat-input-wrap" onSubmit={handleSubmit}>
					<input
						ref={inputRef}
						className="input"
						type="text"
						value={text}
						onChange={(e) => setText(e.target.value)}
						onBlur={handleBlur}
						placeholder="Сообщение..."
						maxLength={200}
						autoComplete="off"
					/>
				</form>
			) : (
				<button type="button" className="chat-toggle" onClick={() => setOpen(true)}>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<title>Чат</title>
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					</svg>
				</button>
			)}
		</div>
	);
}
