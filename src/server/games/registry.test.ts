import { describe, expect, test } from "bun:test";
import type { GamePlugin } from "@/shared/types/game";
import { getPlugin, listPlugins, registerPlugin } from "./registry";

function createFakePlugin(id: string, name: string): GamePlugin {
	return {
		id,
		name,
		minPlayers: 2,
		maxPlayers: 8,
		defaultConfig: {},
		createInitialState: () => ({}),
		reduce: () => null,
		validateAction: () => null,
		getPlayerView: (state) => state,
		getSpectatorView: (state) => state,
		getServerActions: () => [],
		isGameOver: () => false,
	};
}

describe("Game Registry", () => {
	// Note: registry is module-level state, registrations persist across tests.
	// We use unique IDs per test to avoid conflicts.

	test("registerPlugin + getPlugin", () => {
		const plugin = createFakePlugin("test-reg-1", "Test Game 1");
		registerPlugin(plugin);

		expect(getPlugin("test-reg-1")).toBe(plugin);
	});

	test("getPlugin returns null for unknown id", () => {
		expect(getPlugin("nonexistent-game")).toBeNull();
	});

	test("listPlugins returns all registered plugins", () => {
		const p1 = createFakePlugin("test-list-1", "List Game 1");
		const p2 = createFakePlugin("test-list-2", "List Game 2");
		registerPlugin(p1);
		registerPlugin(p2);

		const all = listPlugins();
		expect(all).toContain(p1);
		expect(all).toContain(p2);
	});

	test("re-registering same id overwrites plugin", () => {
		const p1 = createFakePlugin("test-overwrite", "Original");
		const p2 = createFakePlugin("test-overwrite", "Updated");
		registerPlugin(p1);
		registerPlugin(p2);

		expect(getPlugin("test-overwrite")).toBe(p2);
	});
});
