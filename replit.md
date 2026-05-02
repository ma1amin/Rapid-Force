# Rapid Force Cyber Fusion — AI-Native SOC Platform

## Overview

Full-stack autonomous cybersecurity platform. React+Vite frontend + Express API + PostgreSQL. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Routing**: wouter
- **AI**: OpenAI (Replit integration) — SSE streaming copilot at `/api/copilot/analyze`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed:detections` — seed detections + incidents tables

## Artifacts

- **API Server** (`artifacts/api-server`) — Express API on `/api`, port from `PORT` env var
- **Cyber Fusion UI** (`artifacts/cyber-fusion`) — React+Vite frontend at root `/`

## Pages & Features

1. **Command Center** (`/`) — Operations overview: agent fleet KPIs, recharts (utilization, threats, missions), active sprint, threat summary, recent activity
2. **Agent Fleet** (`/agents`) — 12 AI agents with status dropdowns, mission counts, drilldown sheet (⌘K globalSearch)
3. **Sprint Ops** (`/sprints`) — Sprint management with progress bars, create/status update
4. **Missions** (`/missions`) — Mission tracking with priority, category, agent assignment
5. **Threat Intel** (`/threats`) — Threat intelligence with severity badges, inline status mutation
6. **Detection Engineering** (`/detections`) — Sigma/YARA/IOC/Behavioral rules with MITRE ATT&CK, expandable rule content, status management, TP/FP metrics
7. **Incident Response** (`/incidents`) — Active incidents with playbook steps, IOC indicators, containment actions, expandable drilldown
8. **Event Log** (`/activity`) — Real-time activity feed with auto-refresh
9. **AI Copilot** (sidebar button or `⌘/`) — SSE-streaming OpenAI analyst panel with live context (threats, agents, missions), suggested queries

## Database Tables

- `agents` — AI agent fleet
- `sprints` — Sprint planning
- `missions` — Mission tracking
- `threats` — Threat intelligence
- `activity` — Event log
- `detections` — Detection engineering rules (Sigma/YARA/IOC/Behavioral)
- `incidents` — Incident response cases

## API Routes

All under `/api`:
- `GET/POST /agents`, `PATCH /agents/:id`, `GET /agents/summary`
- `GET/POST /sprints`, `PATCH /sprints/:id`
- `GET/POST /missions`, `PATCH /missions/:id`
- `GET/POST /threats`, `PATCH /threats/:id`, `GET /threats/summary`
- `GET /activity`
- `GET/POST /detections`, `PATCH /detections/:id`, `GET /detections/summary`
- `GET/POST /incidents`, `PATCH /incidents/:id`, `GET /incidents/summary`
- `POST /copilot/analyze` — SSE streaming OpenAI chat

## UI Design

Dark tactical theme: `--primary: cyan (#00FFC8)`, `--accent: amber/orange`, `--background: #0a0e14`. Rajdhani font for headings, JetBrains Mono for code/labels.

## Notes

- Auto-refresh on all data: 30s polling interval
- Global search (⌘K) across agents, sprints, missions, threats
- All pages support create + inline status mutation
- OpenAI integration via `@workspace/integrations-openai-ai-server` (Replit-managed API key)
