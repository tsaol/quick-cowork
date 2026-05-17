# Quick Cowork

AI desktop cowork assistant for macOS. A full-featured clone of Amazon Quick Desktop built with Electron.

## Features

- AI Chat (multi-provider: Claude, OpenAI, Bedrock)
- Local file access (sandboxed)
- Persistent memory + knowledge graph
- Integrations (Slack, Gmail, Calendar via MCP)
- Proactive daily briefing
- Document generation (Word, Excel, PPT)
- Custom agents (no-code builder)
- Research (web + local data)
- Automated workflows
- Collaborative Spaces

## Tech Stack

- Electron 35 + React 19 + TypeScript
- Vite + Tailwind CSS
- pnpm workspaces + Turborepo
- SQLite + local vector DB
- MCP (Model Context Protocol)

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm package
```

## License

MIT
