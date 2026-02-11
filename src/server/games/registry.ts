import type { GamePlugin } from "@/shared/types/game";

const plugins = new Map<string, GamePlugin>();

export function registerPlugin(plugin: GamePlugin): void {
	plugins.set(plugin.id, plugin);
	console.log(`[game] registered plugin: ${plugin.name} (${plugin.id})`);
}

export function getPlugin(id: string): GamePlugin | null {
	return plugins.get(id) ?? null;
}

export function listPlugins(): GamePlugin[] {
	return [...plugins.values()];
}
