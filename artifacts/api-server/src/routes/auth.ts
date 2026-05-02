import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, usersTable, moduleLicensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

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

function generateLicenseKey(): string {
  const seg = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RFCF-${seg()}-${seg()}-${seg()}`;
}

const RegisterSchema = z.object({
  orgName:     z.string().min(2).max(100),
  email:       z.string().email(),
  displayName: z.string().min(2).max(100),
  password:    z.string().min(8),
  tier:        z.enum(["trial", "starter", "professional", "enterprise"]).default("trial"),
  licenseKey:  z.string().optional(),
});

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function sessionUser(user: any, tenant: any) {
  return {
    id:          user.id,
    email:       user.email,
    displayName: user.displayName,
    role:        user.role,
    tenantId:    tenant.id,
    tenantName:  tenant.name,
    tenantTier:  tenant.tier,
  };
}

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { orgName, email, displayName, password, tier } = parsed.data;

  // Block registration with the platform admin email
  if (email === process.env.PLATFORM_ADMIN_EMAIL) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }

    const passwordHash = await bcrypt.hash(password, 12);
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const licenseKey = generateLicenseKey();

    const [tenant] = await db.insert(tenantsTable).values({
      name: orgName, slug: `${slug}-${Date.now()}`, tier, licenseKey, isActive: true,
    }).returning();

    const enabledModules = TIER_MODULES[tier] ?? TIER_MODULES["trial"];
    await db.insert(moduleLicensesTable).values(
      MODULES.map(m => ({ tenantId: tenant.id, moduleKey: m, enabled: enabledModules.includes(m) }))
    );

    const [user] = await db.insert(usersTable).values({
      tenantId: tenant.id, email, passwordHash, displayName, role: "admin", isActive: true,
    }).returning();

    const session = (req as any).session;
    session.userId   = user.id;
    session.tenantId = tenant.id;
    session.userRole = user.role;

    res.status(201).json({ user: sessionUser(user, tenant) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid credentials" }); return; }
  const { email, password } = parsed.data;

  // Block tenant login with platform admin email
  if (email === process.env.PLATFORM_ADMIN_EMAIL) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user || !user.isActive) { res.status(401).json({ error: "Invalid email or password" }); return; }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid email or password" }); return; }

    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, user.tenantId));
    if (!tenant || !tenant.isActive) { res.status(403).json({ error: "Organization is inactive" }); return; }

    // Check trial expiry
    if (tenant.tier === "trial" && tenant.trialEndsAt && new Date(tenant.trialEndsAt) < new Date()) {
      await db.update(tenantsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(tenantsTable.id, tenant.id));
      res.status(403).json({ error: "Trial period has expired. Please contact your administrator to upgrade your plan." });
      return;
    }

    await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

    const session = (req as any).session;
    session.userId   = user.id;
    session.tenantId = tenant.id;
    session.userRole = user.role;

    res.json({ user: sessionUser(user, tenant) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", (req, res) => {
  (req as any).session.destroy(() => res.json({ ok: true }));
});

router.get("/auth/me", async (req, res) => {
  const session = (req as any).session;

  // Impersonation mode — return the impersonated tenant user
  if (session?.impersonating) {
    const imp = session.impersonating;
    if (Date.now() > imp.expiresAt) {
      delete session.impersonating;
      res.status(401).json({ error: "Impersonation session expired" });
      return;
    }
    try {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, imp.userId));
      if (!user) { res.status(401).json({ error: "User not found" }); return; }
      const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, imp.tenantId));
      if (!tenant) { res.status(401).json({ error: "Tenant not found" }); return; }
      return res.json({
        ...sessionUser(user, tenant),
        isImpersonating: true,
        impersonatorEmail: imp.adminEmail,
        impersonationExpiresAt: imp.expiresAt,
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
  }

  if (!session?.userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!user) { res.status(401).json({ error: "User not found" }); return; }
    const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, user.tenantId));
    if (!tenant) { res.status(401).json({ error: "Tenant not found" }); return; }
    res.json(sessionUser(user, tenant));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
