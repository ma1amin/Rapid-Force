import { Router } from "express";
import { db, aiAgentsTable, agentTasksTable, agentConversationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SEED_AGENTS = [
  { name: "ARIA-7", role: "detection_engineer" as const, description: "Tier-1/2 SOC analyst specializing in alert triage, initial investigation, and evidence correlation.", specialization: "Alert triage, log analysis, IOC correlation, initial containment", status: "online" as const, tasksCompleted: 1847, successRate: 94.2, model: "gpt-4o", capabilities: JSON.stringify(["Alert classification", "Log correlation", "IOC extraction", "Initial triage", "Evidence gathering", "SIEM query execution"]), avatarColor: "#00FFC8" },
  { name: "HUNTER-3", role: "threat_hunter" as const, description: "Proactive threat hunter that searches for hidden adversaries using behavioral analytics and threat intelligence.", specialization: "Threat hunting, UEBA correlation, attack path mapping, anomaly investigation", status: "investigating" as const, tasksCompleted: 423, successRate: 87.6, model: "gpt-4o", capabilities: JSON.stringify(["Proactive hunting", "Behavioral anomaly detection", "Attack path reconstruction", "MITRE mapping", "Hypothesis generation"]), currentTask: "Hunting lateral movement precursors in authentication logs", avatarColor: "#FF6B35" },
  { name: "FORGE-1", role: "malware_analyst" as const, description: "Deep malware analysis agent for static/dynamic analysis, family identification, and IOC extraction.", specialization: "Malware reverse engineering, sandbox analysis, YARA rule generation, C2 identification", status: "idle" as const, tasksCompleted: 312, successRate: 91.8, model: "gpt-4o", capabilities: JSON.stringify(["Static analysis", "Dynamic sandbox analysis", "Family identification", "C2 beacon detection", "YARA rule generation", "IOC extraction"]), avatarColor: "#FF3366" },
  { name: "SIGMACRAFT", role: "detection_engineer" as const, description: "Automated detection engineer that writes, tests, and deploys Sigma/YARA rules from incident patterns.", specialization: "Sigma rule authoring, detection gap analysis, false positive reduction, MITRE coverage mapping", status: "online" as const, tasksCompleted: 891, successRate: 96.1, model: "gpt-4o", capabilities: JSON.stringify(["Sigma rule generation", "YARA rule writing", "Detection gap analysis", "FP rate optimization", "Coverage mapping", "Rule deployment pipeline"]), avatarColor: "#7C3AED" },
  { name: "COMMANDER-0", role: "incident_commander" as const, description: "Senior incident commander that orchestrates multi-agent workflows, coordinates response, and makes escalation decisions.", specialization: "Incident orchestration, multi-agent coordination, stakeholder communication, executive reporting", status: "online" as const, tasksCompleted: 156, successRate: 98.7, model: "gpt-4o", capabilities: JSON.stringify(["Multi-agent orchestration", "Response coordination", "Escalation decisions", "Executive communication", "Post-incident review", "SLA enforcement"]), avatarColor: "#F59E0B" },
];

let seeding = false;
let seeded = false;

async function seedIfEmpty() {
  if (seeded || seeding) return;
  seeding = true;
  try {
    const existing = await db.select({ id: aiAgentsTable.id }).from(aiAgentsTable).limit(1);
    if (existing.length > 0) { seeded = true; return; }

    const agents = await db.insert(aiAgentsTable).values(SEED_AGENTS).returning();

    const SEED_TASKS = [
      { agentId: agents[0].id, incidentId: 1, type: "triage", title: "Triage: Active Ransomware Deployment", description: "Perform initial triage on active ransomware incident — classify severity, identify affected scope, extract IOCs.", status: "complete" as const, priority: "critical" as const, humanRequired: false, result: "Confirmed LockBit 3.0 variant. 3 nodes compromised. C2 at 185.220.101.47. Exfil via MEGA before encryption. Recommend immediate isolation of PROD-CLUSTER-01/02/03.", reasoning: "File entropy analysis, shadow copy deletion events, and C2 beaconing pattern match LockBit 3.0 TTP. High confidence classification.", evidence: JSON.stringify(["Process tree: vssadmin.exe delete shadows /all", "Network: beacon to 185.220.101.47:443 every 30s", "File: .lockbit extension on 847 files"]), startedAt: new Date(Date.now() - 3600000), completedAt: new Date(Date.now() - 3000000) },
      { agentId: agents[1].id, incidentId: 3, type: "hunt", title: "Hunt: Credential Harvesting Precursors", description: "Search for credential harvesting activity that may precede the detected lateral movement campaign.", status: "in_progress" as const, priority: "high" as const, humanRequired: false, reasoning: "UEBA data shows 3 accounts with anomalous access patterns. Correlating with authentication logs to identify mimikatz or LSASS dump activity.", evidence: JSON.stringify(["LSASS memory access by non-system process", "WDigest registry modification detected"]), startedAt: new Date(Date.now() - 1800000) },
      { agentId: agents[3].id, incidentId: 1, type: "detection", title: "Generate Sigma Rules: LockBit 3.0 TTP", description: "Auto-generate Sigma detection rules from identified LockBit 3.0 TTPs for immediate deployment.", status: "awaiting_approval" as const, priority: "critical" as const, humanRequired: true, result: "title: LockBit 3.0 Shadow Copy Deletion\nstatus: stable\ndescription: Detects shadow copy deletion via vssadmin — common LockBit 3.0 pre-encryption step\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    CommandLine|contains:\n      - 'vssadmin delete shadows'\n      - 'wmic shadowcopy delete'\n  condition: selection\nlevel: critical", reasoning: "Generated 4 Sigma rules covering shadow copy deletion, MEGA upload behavior, file encryption pattern, and C2 beacon. Rules validated against 90-day log corpus — 0 false positives detected.", evidence: JSON.stringify(["4 Sigma rules generated", "0 FPs on 90d corpus", "Coverage: T1490, T1048, T1486"]) },
      { agentId: agents[4].id, incidentId: 1, type: "orchestrate", title: "Coordinate Multi-Agent Ransomware Response", description: "Orchestrate ARIA-7, HUNTER-3, FORGE-1, and SIGMACRAFT for comprehensive ransomware response workflow.", status: "in_progress" as const, priority: "critical" as const, humanRequired: false, reasoning: "Assigned ARIA-7 to triage (complete), FORGE-1 to malware analysis, HUNTER-3 to hunt for additional compromised hosts, SIGMACRAFT to generate coverage rules.", evidence: JSON.stringify(["ARIA-7: triage complete ✓", "FORGE-1: malware analysis in progress", "HUNTER-3: hunting additional hosts", "SIGMACRAFT: rules generated, awaiting approval"]) },
      { agentId: agents[2].id, incidentId: 1, type: "analyze", title: "Malware Analysis: LockBit 3.0 Sample", description: "Perform static and dynamic analysis on recovered LockBit 3.0 binary — extract IOCs, identify C2, generate YARA.", status: "complete" as const, priority: "critical" as const, humanRequired: false, result: "SHA256: a3f4b2c1... | Family: LockBit 3.0 | C2: 185.220.101.47, 91.238.181.99 | YARA rule generated with 97% confidence", reasoning: "Sandbox execution in isolated environment. Binary analysis revealed LockBit 3.0 with ECDH key exchange and intermittent encryption.", evidence: JSON.stringify(["6 C2 IPs extracted", "Encryption key pairs identified", "Anti-VM checks: 14 found"]), startedAt: new Date(Date.now() - 7200000), completedAt: new Date(Date.now() - 5400000) },
    ];

    await db.insert(agentTasksTable).values(SEED_TASKS);
    seeded = true;
  } catch (e) {
    console.error("Agent seed error:", e);
  } finally {
    seeding = false;
  }
}

router.get("/ai-agents", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const agents = await db.select().from(aiAgentsTable).orderBy(aiAgentsTable.id);
    res.json(agents.map(a => ({ ...a, capabilities: JSON.parse(a.capabilities) })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/agent-tasks", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const tasks = await db.select().from(agentTasksTable).orderBy(desc(agentTasksTable.createdAt));
    res.json(tasks.map(t => ({ ...t, evidence: JSON.parse(t.evidence ?? "[]") })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/agent-tasks/:id/approve", requireAuth, async (req, res) => {
  try {
    const { approvedBy } = req.body;
    const [task] = await db.update(agentTasksTable)
      .set({ status: "approved", approvedBy: approvedBy ?? "SOC Analyst", completedAt: new Date() })
      .where(eq(agentTasksTable.id, Number(req.params.id)))
      .returning();
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    if (task.agentId) {
      const [agent] = await db.select().from(aiAgentsTable).where(eq(aiAgentsTable.id, task.agentId));
      if (agent) await db.update(aiAgentsTable).set({ tasksCompleted: agent.tasksCompleted + 1, updatedAt: new Date() }).where(eq(aiAgentsTable.id, task.agentId));
    }
    res.json({ ...task, evidence: JSON.parse(task.evidence ?? "[]") });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/agent-tasks/:id/reject", requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const [task] = await db.update(agentTasksTable)
      .set({ status: "rejected", rejectionReason: reason ?? "Rejected by analyst", completedAt: new Date() })
      .where(eq(agentTasksTable.id, Number(req.params.id)))
      .returning();
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json({ ...task, evidence: JSON.parse(task.evidence ?? "[]") });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/ai-agents/:id/dispatch", requireAuth, async (req, res) => {
  const { incidentId, type, title, description } = req.body;
  if (!type || !title || !description) { res.status(400).json({ error: "type, title, description required" }); return; }
  try {
    await seedIfEmpty();
    const [agent] = await db.select().from(aiAgentsTable).where(eq(aiAgentsTable.id, Number(req.params.id)));
    if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

    const [task] = await db.insert(agentTasksTable).values({
      agentId: agent.id, incidentId: incidentId ?? null, type, title, description,
      status: "in_progress", priority: "high", humanRequired: type === "detection",
      startedAt: new Date(), evidence: "[]",
    }).returning();

    await db.update(aiAgentsTable).set({ status: "investigating", currentTask: title, updatedAt: new Date() }).where(eq(aiAgentsTable.id, agent.id));

    res.status(201).json({ ...task, evidence: [], agent });

    setImmediate(async () => {
      try {
        const caps = JSON.parse(agent.capabilities);
        const completion = await openai.chat.completions.create({
          model: agent.model,
          messages: [
            { role: "system", content: `You are ${agent.name}, an AI ${agent.role.replace(/_/g, " ")} in a cybersecurity SOC. Specialization: ${agent.specialization}. Capabilities: ${caps.join(", ")}. Be concise and technical. Lead with key finding, then evidence, then recommendation.` },
            { role: "user", content: `Task: ${title}\n\nContext: ${description}` },
          ],
          max_tokens: 600,
        });
        const aiResult = completion.choices[0]?.message?.content ?? "Analysis complete.";

        await db.update(agentTasksTable).set({
          status: type === "detection" ? "awaiting_approval" : "complete",
          result: aiResult,
          reasoning: `${agent.name} (${agent.role}) analyzed using: ${caps.slice(0, 3).join(", ")}`,
          completedAt: new Date(),
        }).where(eq(agentTasksTable.id, task.id));

        await db.update(aiAgentsTable).set({ status: "online", currentTask: null, tasksCompleted: agent.tasksCompleted + 1, updatedAt: new Date() }).where(eq(aiAgentsTable.id, agent.id));

        await db.insert(agentConversationsTable).values([
          { taskId: task.id, agentId: agent.id, role: "user", content: `${title}\n\n${description}` },
          { taskId: task.id, agentId: agent.id, role: "assistant", content: aiResult },
        ]);
      } catch {
        await db.update(agentTasksTable).set({ status: "failed", result: "AI analysis unavailable." }).where(eq(agentTasksTable.id, task.id));
        await db.update(aiAgentsTable).set({ status: "online", currentTask: null, updatedAt: new Date() }).where(eq(aiAgentsTable.id, agent.id));
      }
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/agent-tasks/:id/conversation", requireAuth, async (req, res) => {
  try {
    const convos = await db.select().from(agentConversationsTable)
      .where(eq(agentConversationsTable.taskId, Number(req.params.id)))
      .orderBy(agentConversationsTable.createdAt);
    res.json(convos);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
