# Quick Cowork

AI desktop assistant for macOS. A native client built with Electron — no server required.

## Features

| Feature | Description |
|---------|-------------|
| AI Chat | Multi-provider streaming (Anthropic, OpenAI, Bedrock, Ollama) |
| File Access | Sandboxed local file reading with allowlist permissions |
| Memory | Semantic search via sqlite-vec, knowledge graph with d3 visualization |
| Integrations | Slack, Gmail, Calendar via MCP protocol + direct API fallback |
| Documents | Generate Word, Excel, PowerPoint from natural language |
| Agents | No-code builder — define name, instructions, tools, then test interactively |
| Research | Web search (DuckDuckGo) + local file search |
| Briefing | Proactive daily summary from calendar, email, and memories |
| Workflows | Trigger-action automation (schedule or event-based) |
| Spaces | Collaborative multi-user workspaces with shared threads |

## Architecture

```
packages/
  shared/     — Types + IPC channel constants
  core/       — Business logic (LLM, store, memory, integrations, agents, workflows)
  preload/    — Electron contextBridge (secure IPC)
  main/       — Electron main process (window, tray, IPC handlers)
  renderer/   — React UI (Vite, Tailwind 4, lucide-react)
```

## Tech Stack

- Electron 35 + React 19 + TypeScript 5.8
- Vite 6 + Tailwind CSS 4
- pnpm workspaces + Turborepo
- SQLite (better-sqlite3) + sqlite-vec for vector search
- MCP SDK (@modelcontextprotocol/sdk)
- d3-force for knowledge graph visualization

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 11+
- Ollama (optional, for local LLM + embeddings)

### Install and Run

```bash
pnpm install
pnpm dev
```

### Configuration

Open Settings in the app to configure:
- **LLM Provider**: Ollama (local), Anthropic, OpenAI, or AWS Bedrock
- **Embeddings**: Ollama (nomic-embed-text) or OpenAI (text-embedding-3-small)
- **Integrations**: Slack token, Google OAuth credentials for Gmail/Calendar
- **MCP Servers**: Add local MCP servers by command + args

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Dev mode (Vite + Electron)
pnpm build            # Production build
pnpm typecheck        # Type check all packages
pnpm lint             # Lint
pnpm test             # E2E tests (Playwright)
pnpm package          # Build macOS DMG
```

## Data Storage

All data is stored locally at:
```
~/Library/Application Support/quick-cowork/data/data.db
```

## License

MIT
