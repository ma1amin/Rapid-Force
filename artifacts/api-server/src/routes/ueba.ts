import { Router } from "express";
import { db, uebaProfilesTable, uebaAlertsTable, behaviorEventsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const SEED_PROFILES = [
  { entityId: "john.harrison@corp.com", entityType: "user" as const, displayName: "John Harrison", department: "Finance", location: "Chicago, IL", riskScore: 92, riskTrend: "up" as const, anomalyCount: 7, baselineLoginTime: "08:00–17:00", baselineDataAccess: "2.4 GB/day", baselineGeo: "Chicago, IL", recentLoginTime: "02:14 AM", recentDataAccess: "18.7 GB", recentGeo: "Frankfurt, DE", flags: JSON.stringify(["Unusual after-hours access", "Mass file download", "New device login"]) },
  { entityId: "alex.rodriguez@corp.com", entityType: "user" as const, displayName: "Alex Rodriguez", department: "Finance", location: "Chicago, IL", riskScore: 88, riskTrend: "up" as const, anomalyCount: 6, baselineLoginTime: "08:00–17:00", baselineDataAccess: "3.1 GB/day", baselineGeo: "Chicago, IL", recentLoginTime: "11:45 PM", recentDataAccess: "12.4 GB", recentGeo: "Chicago, IL", flags: JSON.stringify(["Multiple failed auth attempts", "Privilege escalation attempt", "Sensitive file access spike"]) },
  { entityId: "sarah.kim@corp.com", entityType: "user" as const, displayName: "Sarah Kim", department: "HR", location: "Austin, TX", riskScore: 74, riskTrend: "up" as const, anomalyCount: 4, baselineLoginTime: "09:00–18:00", baselineDataAccess: "500 MB/day", baselineGeo: "Austin, TX", recentLoginTime: "11:30 AM", recentDataAccess: "4.2 GB", recentGeo: "Austin, TX", flags: JSON.stringify(["Bulk export of PII records", "Privilege escalation attempt"]) },
  { entityId: "WS-FIN-0047", entityType: "host" as const, displayName: "WS-FIN-0047", department: "Finance Workstation", location: "Chicago DC", riskScore: 81, riskTrend: "stable" as const, anomalyCount: 5, baselineLoginTime: null, baselineDataAccess: "800 MB/day", baselineGeo: "Chicago DC", recentLoginTime: null, recentDataAccess: "3.1 GB", recentGeo: "Chicago DC", flags: JSON.stringify(["Lateral movement detected", "Unusual outbound port scan", "New scheduled task"]) },
  { entityId: "mike.torres@corp.com", entityType: "user" as const, displayName: "Mike Torres", department: "IT Operations", location: "New York, NY", riskScore: 58, riskTrend: "down" as const, anomalyCount: 2, baselineLoginTime: "07:00–16:00", baselineDataAccess: "5 GB/day", baselineGeo: "New York, NY", recentLoginTime: "08:15 AM", recentDataAccess: "5.8 GB", recentGeo: "Toronto, CA", flags: JSON.stringify(["VPN from unusual country"]) },
  { entityId: "svc-databackup", entityType: "service" as const, displayName: "svc-databackup", department: "Service Account", location: "Internal", riskScore: 45, riskTrend: "stable" as const, anomalyCount: 1, baselineLoginTime: "01:00–03:00", baselineDataAccess: "20 GB/day", baselineGeo: "Internal", recentLoginTime: "01:05 AM", recentDataAccess: "21 GB", recentGeo: "Internal", flags: JSON.stringify(["Accessing resources outside normal scope"]) },
  { entityId: "WS-IT-0012", entityType: "host" as const, displayName: "WS-IT-0012", department: "IT Workstation", location: "New York DC", riskScore: 35, riskTrend: "stable" as const, anomalyCount: 1, baselineLoginTime: null, baselineDataAccess: "1.5 GB/day", baselineGeo: "New York DC", recentLoginTime: null, recentDataAccess: "1.8 GB", recentGeo: "New York DC", flags: JSON.stringify(["Unsigned software execution"]) },
  { entityId: "linda.chen@corp.com", entityType: "user" as const, displayName: "Linda Chen", department: "Engineering", location: "Seattle, WA", riskScore: 22, riskTrend: "down" as const, anomalyCount: 0, baselineLoginTime: "09:00–18:00", baselineDataAccess: "8 GB/day", baselineGeo: "Seattle, WA", recentLoginTime: "09:10 AM", recentDataAccess: "7.6 GB", recentGeo: "Seattle, WA", flags: JSON.stringify([]) },
];

const SEED_ALERTS = [
  { entityId: "john.harrison@corp.com", entityType: "user" as const, displayName: "John Harrison", alertType: "after_hours_access", severity: "critical" as const, description: "Login at 02:14 AM from Frankfurt, DE — 9.3× outside baseline geo", confidence: "high" },
  { entityId: "john.harrison@corp.com", entityType: "user" as const, displayName: "John Harrison", alertType: "mass_download", severity: "critical" as const, description: "18.7 GB data accessed in 4h — 679% above daily baseline", confidence: "high" },
  { entityId: "alex.rodriguez@corp.com", entityType: "user" as const, displayName: "Alex Rodriguez", alertType: "failed_auth", severity: "high" as const, description: "47 failed authentication attempts within 2-hour window", confidence: "high" },
  { entityId: "alex.rodriguez@corp.com", entityType: "user" as const, displayName: "Alex Rodriguez", alertType: "privilege_escalation", severity: "high" as const, description: "Attempted privilege escalation on CORP-DC-01 at 11:47 PM", confidence: "high" },
  { entityId: "sarah.kim@corp.com", entityType: "user" as const, displayName: "Sarah Kim", alertType: "bulk_export", severity: "high" as const, description: "PII records bulk export: 4,281 employee records exported to external storage", confidence: "high" },
  { entityId: "WS-FIN-0047", entityType: "host" as const, displayName: "WS-FIN-0047", alertType: "lateral_movement", severity: "critical" as const, description: "SMB connection attempts to 14 internal hosts over 2h — MITRE T1021.002", confidence: "high" },
  { entityId: "mike.torres@corp.com", entityType: "user" as const, displayName: "Mike Torres", alertType: "geo_anomaly", severity: "medium" as const, description: "VPN session originated from Toronto, CA — not in approved geo list", confidence: "medium" },
  { entityId: "svc-databackup", entityType: "service" as const, displayName: "svc-databackup", alertType: "scope_violation", severity: "low" as const, description: "Service account accessed /finance/payroll — outside backup scope definition", confidence: "medium" },
];

async function seedIfEmpty() {
  const existing = await db.select({ id: uebaProfilesTable.id }).from(uebaProfilesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(uebaProfilesTable).values(SEED_PROFILES);
    await db.insert(uebaAlertsTable).values(SEED_ALERTS);
  }
}

router.get("/ueba/profiles", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const profiles = await db.select().from(uebaProfilesTable).orderBy(desc(uebaProfilesTable.riskScore));
    const result = profiles.map(p => ({ ...p, flags: JSON.parse(p.flags ?? "[]") }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ueba/alerts", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const alerts = await db.select().from(uebaAlertsTable).orderBy(desc(uebaAlertsTable.triggeredAt));
    res.json(alerts);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ueba/heatmap", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const profiles = await db.select().from(uebaProfilesTable);
    const buckets = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const p of profiles) {
      if (p.riskScore >= 80) buckets.critical++;
      else if (p.riskScore >= 60) buckets.high++;
      else if (p.riskScore >= 40) buckets.medium++;
      else buckets.low++;
    }
    const byType = {
      user:    profiles.filter(p => p.entityType === "user").length,
      host:    profiles.filter(p => p.entityType === "host").length,
      service: profiles.filter(p => p.entityType === "service").length,
    };
    res.json({ buckets, byType, total: profiles.length, avgRisk: Math.round(profiles.reduce((s, p) => s + p.riskScore, 0) / (profiles.length || 1)) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ueba/simulate-event", requireAuth, async (req, res) => {
  const { entityId, entityType, eventType, description, riskDelta } = req.body;
  if (!entityId || !entityType || !eventType || !description) {
    res.status(400).json({ error: "entityId, entityType, eventType, description required" });
    return;
  }
  try {
    const [event] = await db.insert(behaviorEventsTable).values({
      entityId, entityType, eventType, description,
      riskDelta: riskDelta ?? 0,
    }).returning();

    const profile = await db.select().from(uebaProfilesTable).where(eq(uebaProfilesTable.entityId, entityId));
    if (profile.length > 0) {
      const newScore = Math.max(0, Math.min(100, profile[0].riskScore + (riskDelta ?? 0)));
      const trend = riskDelta > 0 ? "up" : riskDelta < 0 ? "down" : "stable";
      await db.update(uebaProfilesTable)
        .set({ riskScore: newScore, riskTrend: trend, anomalyCount: sql`${uebaProfilesTable.anomalyCount} + 1`, lastActivity: new Date(), updatedAt: new Date() })
        .where(eq(uebaProfilesTable.entityId, entityId));

      if (Math.abs(riskDelta ?? 0) >= 10) {
        await db.insert(uebaAlertsTable).values({
          entityId, entityType, displayName: profile[0].displayName,
          alertType: eventType, severity: newScore >= 80 ? "critical" : newScore >= 60 ? "high" : newScore >= 40 ? "medium" : "low",
          description, confidence: "medium",
        });
      }
    }
    res.status(201).json(event);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/ueba/alerts/:id/acknowledge", requireAuth, async (req, res) => {
  try {
    const [updated] = await db.update(uebaAlertsTable)
      .set({ isAcknowledged: true })
      .where(eq(uebaAlertsTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Alert not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
