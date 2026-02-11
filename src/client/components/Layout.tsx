import type { ReactNode } from "react";

interface LayoutProps {
	children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
	return <div className="layout">{children}</div>;
}
