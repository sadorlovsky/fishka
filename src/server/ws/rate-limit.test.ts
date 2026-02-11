import { describe, expect, test } from "bun:test";
import { RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
	test("allows requests within limit", () => {
		const limiter = new RateLimiter(3, 60_000);

		expect(limiter.check("ip1")).toBe(true);
		expect(limiter.check("ip1")).toBe(true);
		expect(limiter.check("ip1")).toBe(true);
	});

	test("rejects requests over limit", () => {
		const limiter = new RateLimiter(2, 60_000);

		expect(limiter.check("ip1")).toBe(true);
		expect(limiter.check("ip1")).toBe(true);
		expect(limiter.check("ip1")).toBe(false);
		expect(limiter.check("ip1")).toBe(false);
	});

	test("tracks different keys independently", () => {
		const limiter = new RateLimiter(1, 60_000);

		expect(limiter.check("ip1")).toBe(true);
		expect(limiter.check("ip2")).toBe(true);
		expect(limiter.check("ip1")).toBe(false);
		expect(limiter.check("ip2")).toBe(false);
	});

	test("resets after window expires", () => {
		const limiter = new RateLimiter(1, 100); // 100ms window

		expect(limiter.check("ip1")).toBe(true);
		expect(limiter.check("ip1")).toBe(false);

		// Simulate time passing by manipulating the entry
		// We'll use sweep + a short wait instead
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				expect(limiter.check("ip1")).toBe(true);
				resolve();
			}, 150);
		});
	});

	test("sweep removes expired entries", () => {
		const limiter = new RateLimiter(5, 100); // 100ms window

		limiter.check("ip1");
		limiter.check("ip2");
		expect(limiter.size).toBe(2);

		return new Promise<void>((resolve) => {
			setTimeout(() => {
				const removed = limiter.sweep();
				expect(removed).toBe(2);
				expect(limiter.size).toBe(0);
				resolve();
			}, 150);
		});
	});

	test("sweep keeps non-expired entries", () => {
		const limiter = new RateLimiter(5, 60_000);

		limiter.check("ip1");
		const removed = limiter.sweep();
		expect(removed).toBe(0);
		expect(limiter.size).toBe(1);
	});
});
