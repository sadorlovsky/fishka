import { describe, expect, test } from "bun:test";
import { parseMessage } from "./connection";

describe("parseMessage", () => {
	test("parses valid JSON with type", () => {
		const result = parseMessage('{"type":"connect","playerName":"Alice","avatarSeed":42}');
		expect(result).toEqual({
			type: "connect",
			playerName: "Alice",
			avatarSeed: 42,
		});
	});

	test("returns null for invalid JSON", () => {
		expect(parseMessage("not json")).toBeNull();
	});

	test("returns null for empty string", () => {
		expect(parseMessage("")).toBeNull();
	});

	test("returns null for JSON without type", () => {
		expect(parseMessage('{"name":"Alice"}')).toBeNull();
	});

	test("returns null for JSON with non-string type", () => {
		expect(parseMessage('{"type":123}')).toBeNull();
	});

	test("parses Buffer input", () => {
		const buf = Buffer.from('{"type":"heartbeat"}');
		const result = parseMessage(buf);
		expect(result).toEqual({ type: "heartbeat" });
	});

	test("returns null for empty object", () => {
		expect(parseMessage("{}")).toBeNull();
	});
});
