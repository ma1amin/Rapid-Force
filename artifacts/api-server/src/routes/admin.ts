import { Router } from "express";
import { db, tenantsTable, usersTable, moduleLicensesTable, adminAuditLogsTable } from "@workspace/db";
import { eq, count, desc, and } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin";

const router = Router();

const MODULES = [
  "command_center", "agent_fleet", "sprint_ops", "missions",
  "threat_intel", "detection_eng", "incidents", "event_log",
  "adversarial_sim", "threat_hunting", "ai_copilot", "license_admin",
];

const TIER_MODULES: Record<string, string[]> = {
  trial:        ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel"],
  starter:      ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions"],
  professional: ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions", "detection_eng", "incidents", "adversarial_sim", "threat_hunting"],
  enterprise:   MODULES,
};

const TIER_PRICE: Record<string, number> = { trial: 0, starter: 99, professional: 299, enterprise: 999 };

function generateLicenseKey(): string {
  const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RFCF-${seg()}-${seg()}-${seg()}`;
}

function logAudit(
  actorEmail: string,
  action: string,
  targetType?: string,
  targetId?: number,
  targetName?: string,
  metadata?: object,
) {
  db.insert(adminAuditLogsTable).values({
    action,
    actorEmail,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    targetName: targetName ?? null,
    metadata: metadata ? JSON.stringify(metadata) : null,
  }).catch(() => {});
}

// ─── Platform Admin Auth ───────────────────────────────────────────────────────

router.post("/admin/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL;
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) { res.status(503).json({ error: "Platform admin not configured" }); return; }
  if (email !== adminEmail || password !== adminPassword) {
    req.log.warn({ email }, "admin: failed login attempt");
    res.status(401).json({ error: "Invalid credentials" }); return;
  }
  const session = (req as any).session;
  session.isPlatformAdmin = true;
  session.platformAdminEmail = email;
  res.json({ ok: true, email });
});

router.post("/admin/auth/logout", (req, res) => {
  (req as any).session.destroy(() => res.json({ ok: true }));
});

router.get("/admin/auth/me", (req, res) => {
  const session = (req as any).session;
  if (!session?.isPlatformAdmin) { res.status(401).json({ error: "Not authenticated" }); return; }
  res.json({ email: session.platformAdminEmail });
});

// ─── Stats ─────────────────────────────────────────────────────────────────────

router.get("/admin/stats", requirePlatformAdmin, async (req, res) => {
  try {
    const [tierCounts, [{ totalUsers }], [{ activeTenants }], recentTenants] = await Promise.all([
      db.select({ tier: tenantsTable.tier, count: count() }).from(tenantsTable).groupBy(tenantsTable.tier),
      db.select({ totalUsers: count() }).from(usersTable),
      db.select({ activeTenants: count() }).from(tenantsTable).where(eq(tenantsTable.isActive, true)),
      db.select().from(tenantsTable).orderBy(desc(tenantsTable.createdAt)).limit(8),
    ]);
    const totalTenants = tierCounts.reduce((s, t) => s + Number(t.count), 0);
    const mrr = tierCounts.reduce((s, t) => s + (TIER_PRICE[t.tier] ?? 0) * Number(t.count), 0);
    res.json({ tierCounts, totalTenants, activeTenants: Number(activeTenants), totalUsers: Number(totalUsers), mrr, recentTenants });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenants List ──────────────────────────────────────────────────────────────

router.get("/admin/tenants", requirePlatformAdmin, async (req, res) => {
  try {
    const tenants = await db
      .select({
        id: tenantsTable.id, name: tenantsTable.name, slug: tenantsTable.slug,
        tier: tenantsTable.tier, licenseKey: tenantsTable.licenseKey,
        isActive: tenantsTable.isActive, trialEndsAt: tenantsTable.trialEndsAt,
        createdAt: tenantsTable.createdAt, updatedAt: tenantsTable.updatedAt,
        userCount: count(usersTable.id),
      })
      .from(tenantsTable)
      .leftJoin(usersTable, eq(usersTable.tenantId, tenantsTable.id))
      .groupBy(tenantsTable.id)
      .orderBy(desc(tenantsTable.createdAt));
    res.json(tenants);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/tenants/:id", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [[tenant], users, modules] = await Promise.all([
      db.select().from(tenantsTable).where(eq(tenantsTable.id, id)),
      db.select({
        id: usersTable.id, email: usersTable.email, displayName: usersTable.displayName,
        role: usersTable.role, isActive: usersTable.isActive,
        lastLoginAt: usersTable.lastLoginAt, createdAt: usersTable.createdAt,
      }).from(usersTable).where(eq(usersTable.tenantId, id)).orderBy(desc(usersTable.createdAt)),
      db.select({ moduleKey: moduleLicensesTable.moduleKey, enabled: moduleLicensesTable.enabled })
        .from(moduleLicensesTable).where(eq(moduleLicensesTable.tenantId, id)),
    ]);
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }
    res.json({ tenant, users, modules });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Bulk Tenant Operations ────────────────────────────────────────────────────

const BulkSchema = z.object({
  ids: z.array(z.number()).min(1),
  action: z.enum(["suspend", "activate", "tier"]),
  tier: z.enum(["trial", "starter", "professional", "enterprise"]).optional(),
});

router.post("/admin/tenants/bulk", requirePlatformAdmin, async (req, res) => {
  const parsed = BulkSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const { ids, action, tier } = parsed.data;
  const session = (req as any).session;
  try {
    for (const id of ids) {
      if (action === "suspend") {
        await db.update(tenantsTable).set({ isActive: false, updatedAt: new Date() }).where(eq(tenantsTable.id, id));
      } else if (action === "activate") {
        await db.update(tenantsTable).set({ isActive: true, updatedAt: new Date() }).where(eq(tenantsTable.id, id));
      } else if (action === "tier" && tier) {
        await db.update(tenantsTable).set({ tier, updatedAt: new Date() }).where(eq(tenantsTable.id, id));
      }
    }
    const actionMap: Record<string, string> = { suspend: "BULK_SUSPEND", activate: "BULK_ACTIVATE", tier: "BULK_TIER_CHANGE" };
    logAudit(session.platformAdminEmail, actionMap[action] ?? "BULK_ACTION", "tenant", undefined, undefined, { ids, tier });
    res.json({ ok: true, updated: ids.length });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Tenant Patch ─────────────────────────────────────────────────────────────

const PatchTenantSchema = z.object({
  tier: z.enum(["trial", "starter", "professional", "enterprise"]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(100).optional(),
  trialEndsAt: z.string().nullable().optional(),
});

router.patch("/admin/tenants/:id", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = PatchTenantSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const session = (req as any).session;
  try {
    const [current] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    if (!current) { res.status(404).json({ error: "Not found" }); return; }

    const updates: any = { updatedAt: new Date() };
    if (parsed.data.tier !== undefined) updates.tier = parsed.data.tier;
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.trialEndsAt !== undefined) {
      updates.trialEndsAt = parsed.data.trialEndsAt ? new Date(parsed.data.trialEndsAt) : null;
    }

    if (parsed.data.tier && parsed.data.tier !== current.tier) {
      const enabledModules = TIER_MODULES[parsed.data.tier] ?? TIER_MODULES.trial;
      for (const m of MODULES) {
        const shouldEnable = enabledModules.includes(m);
        const [existing] = await db.select().from(moduleLicensesTable)
          .where(and(eq(moduleLicensesTable.tenantId, id), eq(moduleLicensesTable.moduleKey, m)));
        if (existing) {
          await db.update(moduleLicensesTable)
            .set({ enabled: shouldEnable, updatedAt: new Date() })
            .where(and(eq(moduleLicensesTable.tenantId, id), eq(moduleLicensesTable.moduleKey, m)));
        }
      }
      logAudit(session.platformAdminEmail, "TENANT_TIER_CHANGED", "tenant", id, current.name, { from: current.tier, to: parsed.data.tier });
    }
    if (parsed.data.isActive !== undefined && parsed.data.isActive !== current.isActive) {
      logAudit(session.platformAdminEmail, parsed.data.isActive ? "TENANT_ACTIVATED" : "TENANT_SUSPENDED", "tenant", id, current.name);
    }
    if (parsed.data.trialEndsAt !== undefined) {
      logAudit(session.platformAdminEmail, "TRIAL_EXPIRY_SET", "tenant", id, current.name, { expiresAt: parsed.data.trialEndsAt });
    }

    const [updated] = await db.update(tenantsTable).set(updates).where(eq(tenantsTable.id, id)).returning();
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Regen Key ────────────────────────────────────────────────────────────────

router.post("/admin/tenants/:id/regen-key", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const session = (req as any).session;
  try {
    const [current] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    if (!current) { res.status(404).json({ error: "Not found" }); return; }
    const newKey = generateLicenseKey();
    const [updated] = await db.update(tenantsTable)
      .set({ licenseKey: newKey, updatedAt: new Date() })
      .where(eq(tenantsTable.id, id)).returning();
    logAudit(session.platformAdminEmail, "TENANT_KEY_REGEN", "tenant", id, current.name, { newKeyPrefix: newKey.substring(0, 9) + "…" });
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Module Toggle ────────────────────────────────────────────────────────────

router.patch("/admin/tenants/:id/modules/:moduleKey", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { moduleKey } = req.params;
  const { enabled } = req.body ?? {};
  if (typeof enabled !== "boolean") { res.status(400).json({ error: "enabled (boolean) required" }); return; }
  const session = (req as any).session;
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    const [existing] = await db.select().from(moduleLicensesTable)
      .where(and(eq(moduleLicensesTable.tenantId, id), eq(moduleLicensesTable.moduleKey, moduleKey)));
    if (existing) {
      await db.update(moduleLicensesTable).set({ enabled, updatedAt: new Date() })
        .where(and(eq(moduleLicensesTable.tenantId, id), eq(moduleLicensesTable.moduleKey, moduleKey)));
    } else {
      await db.insert(moduleLicensesTable).values({ tenantId: id, moduleKey, enabled });
    }
    logAudit(session.platformAdminEmail, "MODULE_TOGGLED", "tenant", id, tenant?.name, { moduleKey, enabled });
    res.json({ ok: true, moduleKey, enabled });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Impersonation ────────────────────────────────────────────────────────────

router.post("/admin/tenants/:id/impersonate", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const session = (req as any).session;
  try {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
    if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }
    if (!tenant.isActive) { res.status(400).json({ error: "Cannot impersonate a suspended tenant" }); return; }

    const users = await db.select().from(usersTable)
      .where(and(eq(usersTable.tenantId, id), eq(usersTable.isActive, true)))
      .orderBy(usersTable.role);

    const target = users.find((u) => u.role === "admin") ?? users[0];
    if (!target) { res.status(404).json({ error: "No active users in this tenant" }); return; }

    const THIRTY_MIN = 30 * 60 * 1000;
    session.impersonating = {
      userId: target.id,
      tenantId: id,
      userRole: target.role,
      adminEmail: session.platformAdminEmail,
      expiresAt: Date.now() + THIRTY_MIN,
    };

    logAudit(
      session.platformAdminEmail, "IMPERSONATION_STARTED", "tenant", id, tenant.name,
      { userId: target.id, userEmail: target.email, userRole: target.role },
    );

    res.json({ ok: true, tenantId: id, userId: target.id });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/impersonate/exit", requirePlatformAdmin, async (req, res) => {
  const session = (req as any).session;
  const imp = session.impersonating;
  if (imp) {
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, imp.tenantId)).catch(() => [undefined]);
    const startedMs = imp.expiresAt - 30 * 60 * 1000;
    const durationMin = Math.round((Date.now() - startedMs) / 60000);
    logAudit(
      session.platformAdminEmail, "IMPERSONATION_ENDED", "tenant", imp.tenantId, tenant?.name,
      { userId: imp.userId, durationMinutes: durationMin },
    );
    delete session.impersonating;
  }
  res.json({ ok: true });
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

router.get("/admin/audit-logs", requirePlatformAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "100"), 500);
    const logs = await db.select().from(adminAuditLogsTable)
      .orderBy(desc(adminAuditLogsTable.createdAt)).limit(limit);
    res.json(logs);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// ─── Users ────────────────────────────────────────────────────────────────────

router.get("/admin/users", requirePlatformAdmin, async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id, email: usersTable.email, displayName: usersTable.displayName,
        role: usersTable.role, isActive: usersTable.isActive,
        lastLoginAt: usersTable.lastLoginAt, createdAt: usersTable.createdAt,
        tenantId: usersTable.tenantId, tenantName: tenantsTable.name, tenantTier: tenantsTable.tier,
      })
      .from(usersTable)
      .leftJoin(tenantsTable, eq(tenantsTable.id, usersTable.tenantId))
      .orderBy(desc(usersTable.createdAt));
    res.json(users);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

const PatchUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["admin", "analyst", "viewer"]).optional(),
});

router.patch("/admin/users/:id", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = PatchUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const session = (req as any).session;
  try {
    const [current] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!current) { res.status(404).json({ error: "Not found" }); return; }
    const updates: any = {};
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (parsed.data.isActive !== undefined && parsed.data.isActive !== current.isActive) {
      logAudit(session.platformAdminEmail, parsed.data.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED", "user", id, current.email);
    }
    if (parsed.data.role !== undefined && parsed.data.role !== current.role) {
      logAudit(session.platformAdminEmail, "USER_ROLE_CHANGED", "user", id, current.email, { from: current.role, to: parsed.data.role });
    }
    res.json({ id: updated.id, email: updated.email, displayName: updated.displayName, isActive: updated.isActive, role: updated.role });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
