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

	test("returns null for unknown message type", () => {
		expect(parseMessage('{"type":"hacked"}')).toBeNull();
	});

	test("rejects connect with missing required fields", () => {
		expect(parseMessage('{"type":"connect"}')).toBeNull();
	});

	test("rejects connect with empty playerName", () => {
		expect(parseMessage('{"type":"connect","playerName":"","avatarSeed":0}')).toBeNull();
	});

	test("rejects connect with playerName too long", () => {
		const name = "A".repeat(21);
		expect(parseMessage(`{"type":"connect","playerName":"${name}","avatarSeed":0}`)).toBeNull();
	});

	test("rejects connect with negative avatarSeed", () => {
		expect(parseMessage('{"type":"connect","playerName":"Alice","avatarSeed":-1}')).toBeNull();
	});

	test("rejects joinRoom with empty roomCode", () => {
		expect(parseMessage('{"type":"joinRoom","roomCode":""}')).toBeNull();
	});
});
