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
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Routing**: wouter
- **AI**: OpenAI (Replit integration) — SSE streaming copilot at `/api/copilot/analyze`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — typecheck libs only
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push-force` — push DB schema changes (use this, not `push`)
- `pnpm --filter @workspace/scripts run seed:detections` — seed detections + incidents tables

## Artifacts

- **API Server** (`artifacts/api-server`) — Express API on `/api`, port from `PORT` env var
- **Cyber Fusion UI** (`artifacts/cyber-fusion`) — React+Vite frontend at root `/`

## Admin Portal

- URL: `/admin` — separate session from tenant portal
- Credentials: `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` env vars (admin@rapidforce.io / RapidForce@Admin2024)
- Auth: `requirePlatformAdmin` middleware checks `session.isPlatformAdmin`
- Admin session is separate from tenant sessions (different session keys)
- All admin routes in `artifacts/api-server/src/routes/admin.ts`

### Admin Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/admin` | Stats, MRR, tier breakdown, recent registrations |
| Tenants | `/admin/tenants` | List, bulk ops, search, suspension |
| Tenant Detail | `/admin/tenants/:id` | Module toggles, tier change, notes, impersonation, force reset |
| Users | `/admin/users` | Cross-tenant user list, role/status management, force reset |
| Analytics | `/admin/analytics` | MRR chart, registration trend, trial alerts, inactive tenants, CSV export |
| Vouchers | `/admin/vouchers` | Voucher/coupon CRUD, redemption history |
| Announcements | `/admin/announcements` | Platform-wide broadcast messages |
| Audit Log | `/admin/audit` | Immutable action log |

### Admin API Routes

All under `/api/admin/*` (require `isPlatformAdmin` session):
- `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me`
- `GET /admin/stats` — dashboard metrics
- `GET /admin/analytics` — MRR, registrations, trial alerts, inactive tenants
- `GET /admin/tenants`, `GET /admin/tenants/:id`, `PATCH /admin/tenants/:id`
- `POST /admin/tenants/bulk` — bulk suspend/activate/tier-change
- `POST /admin/tenants/:id/regen-key`, `PATCH /admin/tenants/:id/modules/:moduleKey`
- `POST /admin/tenants/:id/impersonate`, `POST /admin/impersonate/exit`
- `GET /admin/tenants/:id/notes`, `POST /admin/tenants/:id/notes`, `DELETE /admin/notes/:id`
- `GET /admin/users`, `PATCH /admin/users/:id`, `POST /admin/users/:id/force-reset`
- `GET /admin/vouchers`, `POST /admin/vouchers`, `PATCH /admin/vouchers/:id`, `DELETE /admin/vouchers/:id`
- `GET /admin/vouchers/:id/redemptions`
- `GET /admin/announcements`, `POST /admin/announcements`, `PATCH /admin/announcements/:id`, `DELETE /admin/announcements/:id`
- `GET /admin/audit-logs`, `GET /admin/audit-logs/export` (CSV)

### Public API Routes (no auth)

- `POST /api/vouchers/validate` — validate voucher code
- `GET /api/announcements/active` — active announcements for tenant portal banner

## Tenant Auth API Routes

All under `/api/auth/*`:
- `POST /auth/register` — accepts `voucherCode` (optional, validated + recorded)
- `POST /auth/login` — checks trial expiry, updates `lastLoginAt`
- `POST /auth/logout`
- `GET /auth/me` — returns `mustResetPassword`, `isImpersonating` flags
- `POST /auth/change-password` — skips current password if `mustResetPassword = true`

## Database Tables

### Tenant / Auth
- `tenants` — tenant orgs (name, slug, tier, licenseKey, isActive, trialEndsAt)
- `users` — tenant users (email, passwordHash, role, isActive, mustResetPassword, lastLoginAt)
- `module_licenses` — per-tenant module enable/disable flags
- `admin_audit_logs` — immutable audit trail (action, actorEmail, targetType, targetId, metadata)

### New (Admin Enhancements)
- `vouchers` — discount codes (code, discountType, discountValue, tierRestriction, maxUses, usedCount, expiresAt, isActive)
- `voucher_redemptions` — which tenant used which voucher (voucherId, tenantId, tenantName, redeemedAt)
- `admin_notes` — internal notes per tenant (tenantId, note, createdByEmail)
- `announcements` — platform-wide broadcast messages (title, body, type, isActive, expiresAt)

### Feature
- `agents`, `sprints`, `missions`, `threats`, `activity`, `detections`, `incidents`

## Routing Architecture

- `App.tsx` uses flat `Switch` — all admin routes explicitly listed before the catch-all tenant route
- `AdminAuthProvider` wraps entire app at root (never remounts on navigation)
- `AuthProvider` (tenant) also wraps at root
- `ProtectedRoute` handles tenant auth + `mustResetPassword` enforcement (shows modal overlay)
- `AdminShell` has nav: Dashboard, Tenants, Users, Analytics, Vouchers, Announcements, Audit Log

## UI Design

Dark tactical theme: `--primary: cyan (#00FFC8)`, `--accent: amber/orange`, `--background: #0a0e14`. Rajdhani font for headings, JetBrains Mono for code/labels.

## Tenant Portal Features

- `AnnouncementBanner` — fetches active announcements from `/api/announcements/active`, dismissible per session via sessionStorage, color-coded (info/warning/critical)
- `ImpersonationBanner` — shown when admin is impersonating, with exit button
- Register form — voucher code field with inline validation (validates on blur, shows discount info)
- Force password reset — modal overlay blocks all content until password is changed

## Sprint 6.5 — Phase 2 Leftovers (COMPLETE)

### Detection-as-Code Editor
- `artifacts/cyber-fusion/src/components/editor/RuleEditor.tsx` — CodeMirror v6 editor with YAML (Sigma/Query) and JS (YARA/IOC/Behavioral) syntax highlighting + Dracula theme
- Template library for all 5 rule types (Sigma, YARA, IOC, Query, Behavioral) via INSERT TEMPLATE button
- Lazy-loaded with Suspense for bundle size. Used in both Create form and expanded rule view.
- Packages: `@uiw/react-codemirror`, `@codemirror/lang-yaml`, `@codemirror/lang-javascript`, `@uiw/codemirror-theme-dracula`

### Threat Correlation Engine
- `GET /api/incidents/:id/correlations` — matches related incidents by MITRE technique overlap, same type, shared IOC indicators, similar attack vector
- Returns related incidents (with match reason labels) + correlated threats
- Shown in collapsible correlation panel in Incidents page expanded view (lazy-fetched on expand)

### Automated Response Actions
- `POST /api/incidents/:id/actions` — simulates: `isolate`, `block_ip`, `quarantine`, `snapshot`, `notify`
- Logs timestamped action output to `containmentActions` field and broadcasts via SSE
- Appends activity record (`incident_action` type) for audit trail
- Frontend: 5 action buttons in incident expanded view with loading state + feedback display

### Risk Scoring Engine
- `GET /api/risk-score` — composite risk score (0–100) from open critical/high incidents, active threats, disabled detections, detection coverage
- Returns level (critical/high/medium/low), breakdown by factor, stats
- Dashboard: dedicated Risk Score card next to SOC Health bar, with factor breakdown and risk bar

### SSE Live Event Feed
- `artifacts/api-server/src/lib/event-bus.ts` — in-memory SSE client registry with broadcast
- `GET /api/events/stream` — Server-Sent Events stream with 15s keep-alive pings + auto-reconnect
- `artifacts/cyber-fusion/src/hooks/useLiveEvents.ts` — React hook with auto-reconnect (4s)
- Dashboard: replaces static activity panel with live feed showing SSE events prepended to DB history
- Incidents mutations (create/patch) broadcast events; action executions also broadcast
- Dashboard shows LIVE/POLLING indicator (Wifi icon) based on connection state

## Notes

- Auto-refresh on all data: 30s polling interval (supplement to SSE live feed)
- Global search (⌘K) across agents, sprints, missions, threats
- All pages support create + inline status mutation
- OpenAI integration via `@workspace/integrations-openai-ai-server` (Replit-managed API key)
- DB push: always use `pnpm --filter @workspace/db push-force` (not `push`)
- After DB schema changes: push-force → typecheck:libs → restart API Server workflow
- New Sprint 6.5 routes do NOT use `requireAuth` (matches existing incidents/detections pattern)
- Frontend new endpoints use raw `fetch()` with `credentials: "include"` (not Orval, not in OpenAPI spec)
