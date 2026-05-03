import { Router } from "express";
import { db, playbooksTable, playbookExecutionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const SEED_PLAYBOOKS = [
  { name: "Ransomware Incident Response", description: "Automated triage, isolation, and remediation workflow for ransomware detections", trigger: "Detection: Ransomware / Encryption Activity", category: "Incident Response", status: "active" as const, severity: "critical" as const, automationRate: 94, avgRuntime: "4m 23s", completedRuns: 47, steps: JSON.stringify([{ id: 1, action: "Isolate affected endpoint from network", type: "isolate", automated: true }, { id: 2, action: "Kill suspicious processes (ransomware pattern match)", type: "process_kill", automated: true }, { id: 3, action: "Snapshot disk image for forensics", type: "evidence", automated: true }, { id: 4, action: "Block C2 IP ranges at perimeter firewall", type: "block_ip", automated: true }, { id: 5, action: "Identify lateral movement scope", type: "investigate", automated: false }, { id: 6, action: "Notify SOC lead and CISO", type: "notify", automated: true }, { id: 7, action: "Initiate backup restore procedure", type: "remediate", automated: false }, { id: 8, action: "Verify backup integrity", type: "verify", automated: false }, { id: 9, action: "Re-image endpoint from clean baseline", type: "remediate", automated: false }, { id: 10, action: "Restore from verified backup", type: "remediate", automated: false }, { id: 11, action: "Validate endpoint clean state", type: "verify", automated: true }, { id: 12, action: "Close incident and publish post-mortem", type: "close", automated: false }]) },
  { name: "Phishing Email Triage", description: "Extract IOCs from reported phishing emails, query threat intel, and auto-quarantine", trigger: "Email Report / Alert: Suspicious Email", category: "Threat Intel", status: "active" as const, severity: "high" as const, automationRate: 88, avgRuntime: "1m 12s", completedRuns: 312, steps: JSON.stringify([{ id: 1, action: "Extract email headers and metadata", type: "evidence", automated: true }, { id: 2, action: "Parse links and attachments for IOCs", type: "investigate", automated: true }, { id: 3, action: "Query threat intel feeds (VT, AbuseIPDB, MISP)", type: "enrich", automated: true }, { id: 4, action: "Quarantine email from all mailboxes", type: "isolate", automated: true }, { id: 5, action: "Block sender domain and IP at email gateway", type: "block_ip", automated: true }, { id: 6, action: "Notify affected users", type: "notify", automated: true }, { id: 7, action: "Escalate if credential theft indicators found", type: "escalate", automated: false }, { id: 8, action: "Update threat intel with new IOCs", type: "remediate", automated: true }]) },
  { name: "Lateral Movement Detection", description: "Map lateral movement paths, isolate compromised hosts, preserve evidence", trigger: "Detection: Lateral Movement / SMB Anomaly", category: "Incident Response", status: "active" as const, severity: "critical" as const, automationRate: 76, avgRuntime: "8m 45s", completedRuns: 23, steps: JSON.stringify([{ id: 1, action: "Map SMB/RDP connection graph", type: "investigate", automated: true }, { id: 2, action: "Identify patient-zero endpoint", type: "investigate", automated: true }, { id: 3, action: "Isolate all affected endpoints", type: "isolate", automated: true }, { id: 4, action: "Collect authentication logs from DCs", type: "evidence", automated: true }, { id: 5, action: "Identify compromised credentials", type: "investigate", automated: false }, { id: 6, action: "Force password reset for compromised accounts", type: "remediate", automated: false }, { id: 7, action: "Block lateral movement paths at network layer", type: "block_ip", automated: true }, { id: 8, action: "Notify CISO and domain admin team", type: "notify", automated: true }]) },
  { name: "Brute Force Account Lockout", description: "Detect credential stuffing, auto-lock accounts, and block attack sources", trigger: "Alert: Repeated Auth Failures (>10/5min)", category: "Identity", status: "active" as const, severity: "high" as const, automationRate: 95, avgRuntime: "45s", completedRuns: 156, steps: JSON.stringify([{ id: 1, action: "Lock targeted account(s)", type: "isolate", automated: true }, { id: 2, action: "Block source IPs at WAF", type: "block_ip", automated: true }, { id: 3, action: "Notify account owner via SMS/email", type: "notify", automated: true }, { id: 4, action: "Force MFA re-enrollment", type: "remediate", automated: false }, { id: 5, action: "Analyst review: legitimate lockout or account takeover", type: "investigate", automated: false }]) },
  { name: "Threat Intel Enrichment", description: "Automatically enrich all new IOCs with VirusTotal, AbuseIPDB, and MISP lookups", trigger: "New IOC Ingested", category: "Threat Intel", status: "active" as const, severity: "info" as const, automationRate: 100, avgRuntime: "12s", completedRuns: 2847, steps: JSON.stringify([{ id: 1, action: "Query VirusTotal for hash/IP/domain", type: "enrich", automated: true }, { id: 2, action: "Query AbuseIPDB for IP reputation", type: "enrich", automated: true }, { id: 3, action: "Cross-reference MISP for known threat groups", type: "enrich", automated: true }, { id: 4, action: "Update IOC risk score", type: "remediate", automated: true }, { id: 5, action: "Tag and store enriched IOC", type: "remediate", automated: true }]) },
  { name: "Data Exfiltration Response", description: "Contain active data exfiltration, preserve forensic evidence, and notify compliance team", trigger: "Alert: Unusual Outbound Data Volume (>5GB)", category: "Data Protection", status: "paused" as const, severity: "critical" as const, automationRate: 65, avgRuntime: "12m 30s", completedRuns: 8, steps: JSON.stringify([{ id: 1, action: "Block outbound traffic on flagged endpoint", type: "isolate", automated: true }, { id: 2, action: "Capture DLP logs for exfil path analysis", type: "evidence", automated: true }, { id: 3, action: "Identify destination and data classification", type: "investigate", automated: false }, { id: 4, action: "Notify legal, compliance, and CISO", type: "notify", automated: true }, { id: 5, action: "Preserve forensic chain of custody", type: "evidence", automated: false }, { id: 6, action: "Assess breach notification requirements", type: "investigate", automated: false }]) },
];

async function seedIfEmpty() {
  const existing = await db.select({ id: playbooksTable.id }).from(playbooksTable).limit(1);
  if (existing.length === 0) {
    await db.insert(playbooksTable).values(SEED_PLAYBOOKS);
  }
}

router.get("/playbooks", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const playbooks = await db.select().from(playbooksTable).orderBy(desc(playbooksTable.updatedAt));
    const result = playbooks.map(p => ({ ...p, steps: JSON.parse(p.steps ?? "[]") }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/playbooks", requireAuth, async (req, res) => {
  const { name, description, trigger, category, severity, steps } = req.body;
  if (!name || !description || !trigger || !category) {
    res.status(400).json({ error: "name, description, trigger, category required" });
    return;
  }
  try {
    const [pb] = await db.insert(playbooksTable).values({
      name, description, trigger, category,
      severity: severity ?? "medium",
      steps: JSON.stringify(steps ?? []),
      status: "draft",
    }).returning();
    res.status(201).json({ ...pb, steps: JSON.parse(pb.steps) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/playbooks/:id", requireAuth, async (req, res) => {
  try {
    const [pb] = await db.select().from(playbooksTable).where(eq(playbooksTable.id, Number(req.params.id)));
    if (!pb) { res.status(404).json({ error: "Playbook not found" }); return; }
    res.json({ ...pb, steps: JSON.parse(pb.steps ?? "[]") });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/playbooks/:id", requireAuth, async (req, res) => {
  const { status, name, description, trigger, severity } = req.body;
  try {
    const [updated] = await db.update(playbooksTable)
      .set({ ...(status ? { status } : {}), ...(name ? { name } : {}), ...(description ? { description } : {}), ...(trigger ? { trigger } : {}), ...(severity ? { severity } : {}), updatedAt: new Date() })
      .where(eq(playbooksTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Playbook not found" }); return; }
    res.json({ ...updated, steps: JSON.parse(updated.steps ?? "[]") });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/playbooks/:id/execute", requireAuth, async (req, res) => {
  const { incidentId, triggeredBy } = req.body;
  try {
    const [pb] = await db.select().from(playbooksTable).where(eq(playbooksTable.id, Number(req.params.id)));
    if (!pb) { res.status(404).json({ error: "Playbook not found" }); return; }

    const steps = JSON.parse(pb.steps ?? "[]");
    const stepsResult = steps.map((s: any, i: number) => {
      const isAutomated = s.automated ?? true;
      const success = isAutomated ? Math.random() > 0.05 : true;
      return {
        ...s, status: isAutomated ? (success ? "complete" : "failed") : "pending",
        runtime: isAutomated ? `${Math.floor(Math.random() * 8 + 1)}s` : null,
        completedAt: isAutomated ? new Date().toISOString() : null,
      };
    });

    const allComplete = stepsResult.every((s: any) => s.status !== "failed");
    const [execution] = await db.insert(playbookExecutionsTable).values({
      playbookId: pb.id,
      incidentId: incidentId ?? null,
      status: allComplete ? "complete" : "failed",
      stepsResult: JSON.stringify(stepsResult),
      triggeredBy: triggeredBy ?? "manual",
      startedAt: new Date(),
      completedAt: new Date(),
    }).returning();

    await db.update(playbooksTable)
      .set({ completedRuns: pb.completedRuns + 1, updatedAt: new Date() })
      .where(eq(playbooksTable.id, pb.id));

    res.status(201).json({ ...execution, stepsResult: JSON.parse(execution.stepsResult) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/playbooks/executions/recent", requireAuth, async (req, res) => {
  try {
    const executions = await db.select().from(playbookExecutionsTable).orderBy(desc(playbookExecutionsTable.startedAt)).limit(20);
    const result = executions.map(e => ({ ...e, stepsResult: JSON.parse(e.stepsResult ?? "[]") }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
