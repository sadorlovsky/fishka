const CACHE_NAME = "fishka-v1";

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.add("/"))
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			)
		)
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	const { request } = event;

	// Skip WebSocket and non-GET requests
	if (request.url.includes("/ws") || request.method !== "GET") {
		return;
	}

	// Network-first: try network, fall back to cache
	event.respondWith(
		fetch(request)
			.then((response) => {
				// Cache successful responses
				if (response.ok) {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
				}
				return response;
			})
			.catch(() => caches.match(request))
	);
});
