# fishka

Multiplayer browser game platform built with Bun, React, and TypeScript.

## Games

- **Word Guess (Шляпа)** — timed word explanation game
- **Tapeworm (Червяки)** — tile-laying worm game

## Stack

- **Runtime**: Bun
- **Frontend**: React 19 + TypeScript
- **Transport**: WebSocket (native Bun)
- **Storage**: SQLite (bun:sqlite) + Redis (Bun.redis)

## Development

```bash
bun install
bun dev
```

## Testing

```bash
bun test
```

## Linting

```bash
bun run lint        # check
bun run lint:fix    # autofix
```

## License

[MIT](LICENSE)
