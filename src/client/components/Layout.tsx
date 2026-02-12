import { type ReactNode, useEffect, useRef, useState } from "react";
import { useConnection } from "../contexts/ConnectionContext";

interface LayoutProps {
	children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
	const { status } = useConnection();
	const [showBanner, setShowBanner] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (status === "connected") {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			setShowBanner(false);
		} else if (!showBanner && !timerRef.current) {
			timerRef.current = setTimeout(() => {
				timerRef.current = null;
				setShowBanner(true);
			}, 1000);
		}
	}, [status, showBanner]);

	return (
		<div className="layout">
			{showBanner && (
				<div className="layout-offline-banner">Нет соединения. Переподключение...</div>
			)}
			{children}
		</div>
	);
}
