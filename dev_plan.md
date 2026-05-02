# Rapid Force Cyber Fusion — Master Development Plan

## Platform Vision

Rapid Force Cyber Fusion is an AI-native cybersecurity operations platform that unifies Threat Intelligence, Detection Engineering, Security Automation, Incident Response, Offensive Simulation, Security Analytics, Compliance, and Cyber Fusion Center Operations into a single SaaS multi-tenant platform.

**Goal:** Build a next-generation SOC where AI functions as Tier-1 to Tier-3 analyst, enabling predictive, automated, intelligence-driven cyber defense.

---

## Architecture Overview

```
External Intelligence → Data Collection → Normalization → AI Intelligence
  → Detection → Validation → Response → Fusion Command Center
```

**Stack:**
- Frontend: React + Vite + Tailwind CSS + shadcn/ui (wouter routing)
- Backend: Express 5 + PostgreSQL + Drizzle ORM
- AI: OpenAI (Replit-managed) — SSE streaming copilot
- Monorepo: pnpm workspaces, TypeScript 5.9, Orval codegen

**Design Language:** Dark tactical theme — cyan primary (#00FFC8), amber accent, #0a0e14 background, Rajdhani + JetBrains Mono fonts.

---

## Subscription Tiers

| Tier | Price | Modules |
|---|---|---|
| Trial | Free | Command Center, Agent Fleet, Event Log, AI Copilot, Threat Intel |
| Starter | $99/mo | + Sprint Ops, Missions |
| Professional | $299/mo | + Detection Eng, Incidents, Adversarial Sim, Threat Hunting |
| Enterprise | $999/mo | All modules including Compliance, UEBA, CISO Dashboard |

---

## Phase 1 — Core Platform Foundation ✅ COMPLETE

**Sprint 1 — Tenant Auth + Admin Portal Foundation**
- [x] Multi-tenant PostgreSQL schema (tenants, users, module_licenses)
- [x] Tenant registration with voucher code support
- [x] Bcrypt password hashing, session auth, force-reset flow
- [x] Admin portal (separate session): login, dashboard, tenant list
- [x] Admin: tenant detail, module toggles, tier changes
- [x] Admin: user management, audit log, announcements
- [x] Admin: vouchers/coupons with redemption tracking
- [x] Admin: analytics (MRR trends, registration trends, trial alerts)
- [x] Admin: license management (per-tenant module override)
- [x] Module gating system (`ModuleGate` component + `LicenseProvider`)
- [x] Impersonation system (admin → tenant user)
- [x] Announcement banner (platform-wide broadcast)
- [x] ImpersonationBanner with exit button

**Sprint 2 — Agent Fleet + Missions + Sprints**
- [x] Agents page: fleet status, roles, mission counts, status mutation
- [x] Missions page: task board by priority/category, create/update
- [x] Sprints page: sprint tracking with velocity metrics
- [x] Activity log with real-time feed
- [x] Dashboard: aggregated metrics, agent status, threat summary
- [x] Global search (⌘K) across agents, missions, threats, sprints
- [x] 30-second auto-refresh on all data pages

**Sprint 3 — Threat Intelligence + Detection Engineering**
- [x] Threat Intel module: threat database with MITRE ATT&CK tags
- [x] Live OSINT feed (IRONSIGHT-style)
- [x] Geo threat map visualization
- [x] Detections page: detection rules, status management
- [x] DB seeder for detections + incidents
- [x] Threat severity scoring + priority classification

**Sprint 4 — Incident Response + Adversarial Simulation**
- [x] Incidents page: IR workflow with containment actions
- [x] MITRE ATT&CK technique mapping per incident
- [x] IOC indicators panel
- [x] Playbook steps (manual)
- [x] Adversarial Sim: multi-phase scanner (Recon → Port Scan → Vuln Scan → Exploit → Report)
- [x] AI-generated assessment reports via OpenAI
- [x] Threat Hunting page: hunt creation and tracking

**Sprint 5 — AI Copilot + UI Polish**
- [x] AI Copilot panel (collapsible sidebar)
- [x] SSE streaming at `/api/copilot/analyze`
- [x] Quick action buttons (Security Posture, Active Threats, Detection Gaps)
- [x] OpenAI integration via Replit-managed API key
- [x] Tactical dark theme finalization
- [x] Login / Register page redesign
- [x] Shell layout with sidebar navigation

**Sprint 6 — Admin Portal Completion**
- [x] AdminLicenseAdmin: per-tenant tier + module management UI
- [x] AdminAnalytics: MRR chart, registration trend, inactive tenants, CSV export
- [x] AdminVouchers: full CRUD + redemption history
- [x] AdminAnnouncements: scheduled expiry, soft-delete, restore
- [x] AdminAuditLog: immutable action trail
- [x] AdminUsers: cross-tenant user role/status management
- [x] AdminTenantDetail: notes, impersonation, force reset
- [x] Bulk operations on tenant list (activate/suspend/tier-change)

---

## Phase 2 — Intelligence + Automation Layer ✅ MOSTLY COMPLETE

**Sprint 6 Continuation — Platform Hardening**
- [x] AnnouncementBanner: dismissible per session, color-coded (info/warning/critical)
- [x] ProtectedRoute: mustResetPassword modal enforcement
- [x] AdminShell: consistent admin navigation
- [x] Force password reset flow
- [x] Trial expiry enforcement at login
- [x] Module gating enforced on all tenant routes

**Remaining Phase 2 Items (Sprint 6.5)**
- [ ] Detection-as-Code: Sigma/YARA rule editor with syntax highlighting
- [ ] Automated response action execution (endpoint isolation simulation)
- [ ] Threat correlation engine (link related threats/incidents)
- [ ] Risk scoring per tenant/asset
- [ ] WebSocket live event feed

---

## Phase 3 — Advanced Intelligence + Compliance + Behavioral Analytics 🚀 IN PROGRESS

### Sprint 7 — Compliance & GRC Module

**Goal:** Full compliance posture management with framework mapping, scoring, gap analysis, and AI recommendations.

**Backend:**
- [ ] `compliance_frameworks` table: id, key, name, description, version
- [ ] `compliance_controls` table: id, frameworkKey, controlId, title, description, moduleKey (mapped platform module)
- [ ] `compliance_assessments` table: id, tenantId, frameworkKey, score, assessedAt
- [ ] API: `GET /api/compliance/frameworks` — list all frameworks
- [ ] API: `GET /api/compliance/posture` — per-tenant score per framework
- [ ] API: `GET /api/compliance/gaps` — controls not covered by active modules
- [ ] API: `GET /api/compliance/report` — generate compliance report
- [ ] API: `POST /api/compliance/ai-assess` — AI-powered gap analysis + recommendations

**Frontend:**
- [ ] `/compliance` route (Professional+ tier)
- [ ] Framework selector tabs: NIST CSF, ISO 27001, CIS Controls, SOC2, HIPAA, CMMC, SAMA
- [ ] Compliance score ring per framework (0–100%)
- [ ] Control mapping table: control ID, description, status (covered/gap/partial)
- [ ] Gap analysis view: uncovered controls with recommended actions
- [ ] AI assessment panel: streaming recommendations via Copilot
- [ ] Export compliance report (PDF-ready HTML)

**Framework Mappings (built-in):**

| Module | NIST | ISO 27001 | CIS | SOC2 |
|---|---|---|---|---|
| command_center | ID.AM, RS.CO | A.12.6 | CIS-1 | CC6 |
| threat_intel | DE.AE, ID.RA | A.12.4 | CIS-7 | CC7 |
| detection_eng | DE.CM, DE.AE | A.16.1 | CIS-8 | CC7 |
| incidents | RS.RP, RS.CO | A.16.1 | CIS-19 | CC7 |
| agent_fleet | PR.AT, ID.AM | A.7.2 | CIS-17 | CC1 |
| adversarial_sim | PR.IP, ID.RA | A.18.2 | CIS-18 | CC4 |
| threat_hunting | DE.CM, DE.DP | A.12.4 | CIS-8 | CC7 |
| sprint_ops | PR.IP | A.14.2 | CIS-14 | CC8 |

---

### Sprint 8 — Behavioral Analytics / UEBA Module

**Goal:** User and entity behavior analytics with anomaly detection and risk scoring.

**Backend:**
- [ ] `behavior_events` table: userId, tenantId, eventType, metadata, riskScore, timestamp
- [ ] `ueba_profiles` table: userId, baselineMetrics (JSON), anomalyScore, lastUpdated
- [ ] `ueba_alerts` table: id, tenantId, userId, alertType, severity, description, triggeredAt
- [ ] API: `GET /api/ueba/alerts` — active behavior anomalies
- [ ] API: `GET /api/ueba/profiles` — user risk profiles
- [ ] API: `GET /api/ueba/heatmap` — risk heatmap data (by user/asset/time)
- [ ] API: `POST /api/ueba/simulate-event` — simulate a behavior event for testing
- [ ] Background job: anomaly scoring engine (rule-based for MVP)

**Frontend:**
- [ ] `/behavioral-analytics` route (Enterprise tier)
- [ ] Risk heatmap: color-coded grid (users × time × risk level)
- [ ] User risk profile cards: baseline vs. current behavior delta
- [ ] Anomaly alert feed: real-time list with severity
- [ ] Behavior timeline: per-user event sequence visualization
- [ ] Integration with Incidents: auto-create incident from UEBA alert
- [ ] AI analysis: "Why is this user flagged?" streaming explanation

---

### Sprint 9 — AI-Driven Automated Playbooks

**Goal:** Automatically trigger and execute response playbooks from incidents using AI.

**Backend:**
- [ ] `playbooks` table: id, tenantId, name, triggerCondition (JSON), steps (JSON), isActive
- [ ] `playbook_executions` table: id, playbookId, incidentId, status, steps (JSON with results), startedAt
- [ ] API: `GET /api/playbooks` — list playbooks
- [ ] API: `POST /api/playbooks` — create playbook
- [ ] API: `POST /api/playbooks/:id/execute` — manually trigger
- [ ] API: `GET /api/playbooks/executions` — execution history
- [ ] API: `POST /api/ai/generate-playbook` — AI generates playbook from incident context
- [ ] Auto-trigger: when incident severity = critical, match playbooks

**Frontend:**
- [ ] `/playbooks` route (Professional+ tier)
- [ ] Playbook builder: drag-and-drop step editor
- [ ] Step types: Notify, Isolate, Block IP, Collect Evidence, Escalate, Custom Script
- [ ] Trigger conditions: by severity, threat type, source IP, ATT&CK technique
- [ ] Execution view: real-time step-by-step progress
- [ ] AI Playbook Generator: describe incident → AI generates full playbook
- [ ] Execution history with step outcomes
- [ ] Integration with Incidents page

---

### Sprint 10 — Executive / CISO Dashboard

**Goal:** Role-specific strategic dashboard for CISO and executive stakeholders.

**Backend:**
- [ ] API: `GET /api/executive/summary` — KPIs: MTTD, MTTR, threats blocked, compliance score
- [ ] API: `GET /api/executive/risk-posture` — overall risk score trend (30 days)
- [ ] API: `GET /api/executive/threat-landscape` — threat category breakdown
- [ ] API: `GET /api/executive/sla-metrics` — SLA performance per incident type
- [ ] API: `GET /api/executive/roi` — detection count, incidents resolved, automation savings

**Frontend:**
- [ ] `/executive` route (Enterprise tier)
- [ ] Role gate: only user role `ciso` or `manager` can access
- [ ] KPI strip: MTTD, MTTR, Threats Blocked (30d), Compliance Score
- [ ] Risk posture trend chart (30-day sparkline)
- [ ] Threat landscape pie/donut: category breakdown
- [ ] Compliance score matrix: all frameworks side by side
- [ ] Automation ROI panel: hours saved, incidents auto-resolved
- [ ] Board-ready export: printable PDF summary
- [ ] No sidebar clutter — clean executive layout

---

### Sprint 11 — Predictive EWS (Early Warning System)

**Goal:** Proactive threat prediction using intelligence correlation, behavioral signals, and geo data.

**Backend:**
- [ ] `ews_signals` table: id, tenantId, signalType, source, description, confidence, triggeredAt
- [ ] `ews_predictions` table: id, tenantId, threatCategory, probability, timeframe, evidence (JSON)
- [ ] API: `GET /api/ews/signals` — active early warning signals
- [ ] API: `GET /api/ews/predictions` — current threat predictions
- [ ] API: `POST /api/ews/analyze` — trigger AI prediction from current signal set
- [ ] Signal sources: threat intel feed, UEBA alerts, geo threat map, detection trends
- [ ] Confidence scoring algorithm

**Frontend:**
- [ ] `/early-warning` route (Enterprise tier)
- [ ] Signal feed: ranked list of active signals with confidence %
- [ ] Prediction cards: "High probability of credential attack in next 24h" style
- [ ] Evidence panel: what signals are feeding the prediction
- [ ] Geo risk overlay: regions with elevated threat signals
- [ ] AI analysis: "What should I do now?" streaming action plan
- [ ] Timeline: when predictions were made vs. when threats materialized

---

## Phase 4 — Autonomous SOC (Future)

### Sprint 12 — Plugin & Marketplace Foundation

- [ ] Plugin gateway API: `/api/plugins/registry`, `/api/plugins/install`
- [ ] Plugin manifest schema (name, version, permissions, endpoints)
- [ ] Plugin sandbox: isolated execution context
- [ ] Built-in plugins: Slack notify, PagerDuty escalate, Jira ticket
- [ ] Plugin management UI: install/enable/disable/version rollback
- [ ] Marketplace page: browse available plugins

### Sprint 13 — Advanced AI Agent Orchestration

- [ ] AI agent roles: SOC Analyst, Threat Hunter, Malware Analyst, Detection Engineer, Incident Commander
- [ ] Agent task queue: assign investigations to specific AI agents
- [ ] Agent conversation log: full audit trail of AI reasoning
- [ ] Multi-agent workflow: Detect → Investigate → Respond chain
- [ ] Agent performance metrics: accuracy, speed, false positive rate
- [ ] Human-in-the-loop: approve/reject agent decisions

### Sprint 14 — Detection-as-Code IDE

- [ ] In-platform Sigma rule editor with syntax highlighting
- [ ] YARA rule editor with test file upload
- [ ] Rule validation engine (dry run against historical events)
- [ ] Rule deployment pipeline: Draft → Review → Test → Production
- [ ] MITRE ATT&CK technique browser (integration with MITRE Navigator)
- [ ] Rule version control (diff, rollback)
- [ ] Shared rule library (community rules)

### Sprint 15 — Autonomous SOC Operations

- [ ] Autonomous triage: AI handles Tier-1 analysis end-to-end
- [ ] Self-improving detections: AI proposes rule updates from false positives
- [ ] Automated threat hunting: AI schedules and runs hunts
- [ ] Continuous compliance monitoring: auto-assess on module changes
- [ ] AI-generated executive briefings (scheduled, PDF)
- [ ] Threat prediction model training on tenant data
- [ ] Zero-human-touch incident resolution (contained threats)

---

## Module Registry

| Module Key | Label | Min Tier | Phase |
|---|---|---|---|
| command_center | Command Center | Trial | 1 |
| agent_fleet | Agent Fleet | Trial | 1 |
| event_log | Event Log | Trial | 1 |
| ai_copilot | AI Copilot | Trial | 1 |
| threat_intel | Threat Intel | Trial | 1 |
| sprint_ops | Sprint Ops | Starter | 1 |
| missions | Missions | Starter | 1 |
| detection_eng | Detection Eng. | Professional | 1 |
| incidents | Incidents | Professional | 1 |
| adversarial_sim | Adversarial Sim | Professional | 1 |
| threat_hunting | Threat Hunting | Professional | 1 |
| compliance | Compliance & GRC | Enterprise | 3 |
| behavioral_analytics | Behavioral Analytics | Enterprise | 3 |
| playbooks | Automated Playbooks | Professional | 3 |
| executive | Executive Dashboard | Enterprise | 3 |
| early_warning | Predictive EWS | Enterprise | 3 |
| plugins | Plugin Marketplace | Enterprise | 4 |

---

## Database Schema Summary

### Phase 1-2 Tables (Existing)
- `tenants` — org accounts (name, slug, tier, licenseKey, isActive, trialEndsAt)
- `users` — tenant users (email, passwordHash, role, mustResetPassword, lastLoginAt)
- `module_licenses` — per-tenant module overrides
- `admin_audit_logs` — immutable admin action trail
- `vouchers` + `voucher_redemptions`
- `admin_notes` — internal tenant notes
- `announcements`
- `agents`, `sprints`, `missions`, `threats`, `activity`, `detections`, `incidents`

### Phase 3 Tables (Planned)
- `compliance_controls` — framework control definitions with module mappings
- `behavior_events` — raw UEBA event stream
- `ueba_profiles` + `ueba_alerts`
- `playbooks` + `playbook_executions`
- `ews_signals` + `ews_predictions`

---

## API Routes Summary

### Tenant API (all under `/api/*`, require session)
- `/api/auth/*` — login, register, logout, me, change-password
- `/api/agents`, `/api/sprints`, `/api/missions`, `/api/threats`
- `/api/detections`, `/api/incidents`, `/api/activity`
- `/api/copilot/analyze` — SSE AI streaming
- `/api/announcements/active`
- `/api/licenses` — module license state for tenant

### Phase 3 Routes (Planned)
- `/api/compliance/*` — posture, gaps, frameworks, AI assess
- `/api/ueba/*` — alerts, profiles, heatmap
- `/api/playbooks/*` — CRUD + execution
- `/api/executive/*` — KPIs, risk posture, threat landscape
- `/api/ews/*` — signals, predictions, AI analyze

### Admin API (all under `/api/admin/*`, require isPlatformAdmin)
- `/api/admin/auth/*`, `/api/admin/stats`, `/api/admin/analytics`
- `/api/admin/tenants`, `/api/admin/users`
- `/api/admin/vouchers`, `/api/admin/announcements`
- `/api/admin/audit-logs`

---

## Security Model

- Zero Trust: every request validated, no implicit trust
- RBAC: user roles (admin, analyst, viewer) enforced at API level
- Session-based auth: separate sessions for tenant and admin portals
- Immutable audit trail: all admin actions logged
- Module licensing: server-enforced, not just client-side gating
- Trial enforcement: login blocked after trial expiry
- Impersonation: full audit trail, session flag, visible banner

---

## Deployment

- Published via Replit Deployments
- API Server: Express on `PORT` env var, path `/api`
- Frontend: Vite static, path `/`
- Admin credentials: `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`
- DB: Replit-managed PostgreSQL, push schema with `pnpm --filter @workspace/db push-force`

---

*Last updated: Sprint 6 complete, Phase 3 Sprint 7 in progress.*
