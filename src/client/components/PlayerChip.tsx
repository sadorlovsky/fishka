import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import "./PlayerChip.css";

interface PlayerChipProps {
	avatarSeed: number;
	name: string;
	isMe?: boolean;
	isHost?: boolean;
	isActive?: boolean;
	isCurrent?: boolean;
	disconnected?: boolean;
	subtitle?: string;
	size?: "default" | "compact";
	children?: ReactNode;
}

export function PlayerChip({
	avatarSeed,
	name,
	isMe,
	isHost,
	isActive,
	isCurrent,
	disconnected,
	subtitle,
	size = "default",
	children,
}: PlayerChipProps) {
	const classes = [
		"player-chip",
		size === "compact" && "player-chip--compact",
		isActive && "player-chip--active",
		isCurrent && "player-chip--current",
		disconnected && "player-chip--disconnected",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={classes}>
			<Avatar seed={avatarSeed} size="sm" />
			<div className="player-chip-info">
				<span className="player-chip-name">
					{name}
					{isMe && <span className="badge you-badge">вы</span>}
					{isHost && <span className="badge host-badge">хост</span>}
				</span>
				{subtitle && <span className="player-chip-subtitle">{subtitle}</span>}
			</div>
			{children && <div className="player-chip-slot">{children}</div>}
		</div>
	);
}
