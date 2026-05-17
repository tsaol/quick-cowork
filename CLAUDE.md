# Quick Cowork

## Project Overview

macOS desktop AI assistant (Electron + React + TypeScript). Clone of Amazon Quick Desktop.

## Architecture

- `packages/main` - Electron main process (window, tray, IPC handlers, services)
- `packages/renderer` - React UI (Vite, Tailwind, shadcn/ui)
- `packages/preload` - Secure contextBridge (typed IPC API)
- `packages/core` - Business logic (LLM, memory, agents, integrations)
- `packages/shared` - Types + constants (no logic)

## Git Workflow (GitFlow)

- **tsaol**: design, review, merge
- **leoc-76**: coding, push, PR

Branches:
- `main` - stable releases
- `develop` - integration
- `feature/<name>` - new features
- `release/v<x.y.z>` - release prep
- `hotfix/<name>` - critical fixes

## Commands

```bash
pnpm install          # install deps
pnpm dev              # dev mode (all packages)
pnpm build            # production build
pnpm typecheck        # type check
pnpm lint             # lint
pnpm test             # run tests
pnpm package          # build DMG
```

## Commit Style

Use short, casual messages. No conventional commits.
- Good: "add chat ui", "fix ipc streaming"
- Bad: "feat: implement comprehensive chat interface"
