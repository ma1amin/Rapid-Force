import { Router } from "express";
import { db, autonomousActionsTable, aiBriefingsTable, incidentsTable, threatsTable, detectionsTable } from "@workspace/db";
import { eq, desc, and, ne } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SEED_ACTIONS = [
  { type: "triage" as const, title: "AI Triage: Active Ransomware Deployment", description: "Autonomous triage of critical ransomware incident — severity classification, scope assessment, initial containment recommendations.", status: "complete" as const, incidentId: 1, incidentTitle: "Active Ransomware Deployment — Production Cluster", riskLevel: "critical" as const, reasoning: "LockBit 3.0 indicators confirmed via file entropy analysis, shadow copy deletion events, and C2 beaconing. Immediate isolation recommended.", result: "CLASSIFICATION: Critical Ransomware — LockBit 3.0\nSCOPE: 3 production nodes (PROD-01, PROD-02, PROD-03)\nIOCs EXTRACTED: 6 C2 IPs, 1 malware hash\nCONTAINMENT: Isolation recommended immediately\nEXFIL ASSESSMENT: Data exfiltration likely occurred via MEGA before encryption", requiresApproval: false, confidence: 0.96 },
  { type: "isolate" as const, title: "Auto-Isolate: PROD-CLUSTER-01, 02, 03", description: "Autonomous host isolation of 3 production nodes based on confirmed ransomware activity.", status: "approved" as const, incidentId: 1, incidentTitle: "Active Ransomware Deployment — Production Cluster", riskLevel: "critical" as const, reasoning: "Ransomware confirmed. Lateral movement actively spreading. Immediate isolation prevents further encryption and exfiltration.", result: "ISOLATION COMPLETE\nHosts: PROD-CLUSTER-01, PROD-CLUSTER-02, PROD-CLUSTER-03\nNetwork segments: Production VLAN 100 quarantined\nFirewall rules: 3 host rules added\nTime to isolate: 47 seconds", requiresApproval: true, approvedBy: "SOC Lead — Jane Chen", confidence: 0.98 },
  { type: "block_ip" as const, title: "Block C2 Infrastructure — 6 IPs", description: "Block confirmed LockBit 3.0 C2 IP addresses at perimeter firewall and all internal network egress points.", status: "complete" as const, incidentId: 1, incidentTitle: "Active Ransomware Deployment — Production Cluster", riskLevel: "critical" as const, reasoning: "6 C2 IPs confirmed via malware sample analysis and beacon traffic correlation. Blocking eliminates threat actor command channel.", result: "BLOCKED: 185.220.101.47, 91.238.181.99, 194.165.16.21, 23.105.131.137, 45.142.212.100, 185.220.101.26\nMethod: Palo Alto NGFW + Cisco ASA ACL\nIngress/Egress: Both directions blocked\nDuration: Indefinite (threat intel IOC)", requiresApproval: false, confidence: 0.99 },
  { type: "investigate" as const, title: "AI Investigation: Lateral Movement Scope", description: "Autonomous investigation to determine full scope of lateral movement — how many hosts touched, credentials compromised.", status: "awaiting_approval" as const, incidentId: 3, incidentTitle: "Lateral Movement — Pass-the-Hash Detected", riskLevel: "high" as const, reasoning: "Pass-the-hash pattern detected across 14 internal hosts. Need to identify all compromised accounts and lateral paths before remediation.", result: "INVESTIGATION FINDINGS:\n• Patient zero: WS-FIN-0047 (Finance workstation)\n• Lateral path: WS-FIN-0047 → CORP-DC-01 → PROD-DB-01 → CORP-FILE-02\n• Compromised accounts: 3 (svc-backup, john.harrison, CORP\\admin)\n• Technique: NTLM Pass-the-Hash (T1550.002)\n• Persistence: 2 scheduled tasks created on CORP-DC-01\nRECOMMENDATION: Reset all 3 accounts, remove scheduled tasks, rotate all NTLM hashes", requiresApproval: true, confidence: 0.87 },
  { type: "notify" as const, title: "Executive Notification: Critical Ransomware", description: "Auto-generate and send executive briefing for active ransomware incident to CISO, CTO, and legal team.", status: "complete" as const, incidentId: 1, incidentTitle: "Active Ransomware Deployment — Production Cluster", riskLevel: "critical" as const, reasoning: "SLA breach imminent. CISO notification required within 1 hour of critical incident confirmation. Data exfiltration may trigger breach notification obligations.", result: "NOTIFIED:\n• CISO (Sarah Mitchell) — via secure channel + PagerDuty\n• CTO (David Park) — via Slack #exec-security\n• Legal/GC (Robert Kim) — for breach notification assessment\n• On-call IR team — PagerDuty escalation\nBriefing: 2-page executive summary generated\nTime: Within 12 minutes of incident confirmation", requiresApproval: false, confidence: 1.0 },
  { type: "triage" as const, title: "AI Triage: Phishing Campaign — Executive Impersonation", description: "Triage detected phishing campaign targeting executive team with impersonation lures.", status: "complete" as const, incidentId: 4, incidentTitle: "Phishing Campaign — Executive Impersonation", riskLevel: "high" as const, reasoning: "Pattern matches BEC (Business Email Compromise) campaign. 14 executives targeted. 3 emails opened, 0 credentials entered (based on tracking pixel data).", result: "CLASSIFICATION: BEC Phishing — Executive Impersonation\nTARGETS: 14 executive mailboxes\nOPENED: 3 emails (tracking pixel confirmed)\nCREDENTIALS ENTERED: 0 (form telemetry)\nSENDER INFRASTRUCTURE: 3 lookalike domains identified\nRECOMMENDATION: Block domains, warn users, add DMARC enforcement", requiresApproval: false, confidence: 0.93 },
  { type: "close" as const, title: "Auto-Close: Benign PowerShell Scan", description: "Autonomous closure of low-fidelity PowerShell alert after automated verification determined benign behavior.", status: "complete" as const, riskLevel: "low" as const, reasoning: "PowerShell execution by known admin account during scheduled maintenance window. Script hash matches approved IT automation library. Zero IOC overlap.", result: "VERDICT: Benign — False Positive\nCONFIRMED: Authorized script (hash: a1b2c3...)\nADMIN: IT-OPS service account\nWINDOW: Scheduled maintenance (02:00–04:00)\nACTION: Alert suppression rule added for this pattern", requiresApproval: false, confidence: 0.99 },
];

async function seedIfEmpty() {
  const existing = await db.select({ id: autonomousActionsTable.id }).from(autonomousActionsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(autonomousActionsTable).values(SEED_ACTIONS);
  }
}

router.get("/autonomous/actions", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const actions = await db.select().from(autonomousActionsTable).orderBy(desc(autonomousActionsTable.createdAt));
    res.json(actions);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/autonomous/actions/:id/approve", requireAuth, async (req, res) => {
  try {
    const { approvedBy } = req.body;
    const [action] = await db.update(autonomousActionsTable)
      .set({ status: "approved", approvedBy: approvedBy ?? "SOC Analyst", executedAt: new Date() })
      .where(eq(autonomousActionsTable.id, Number(req.params.id)))
      .returning();
    if (!action) { res.status(404).json({ error: "Action not found" }); return; }
    res.json(action);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/autonomous/actions/:id/reject", requireAuth, async (req, res) => {
  try {
    const [action] = await db.update(autonomousActionsTable)
      .set({ status: "rejected" })
      .where(eq(autonomousActionsTable.id, Number(req.params.id)))
      .returning();
    if (!action) { res.status(404).json({ error: "Action not found" }); return; }
    res.json(action);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/autonomous/triage/:incidentId", requireAuth, async (req, res) => {
  const incidentId = Number(req.params.incidentId);
  try {
    const [incident] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, incidentId));
    if (!incident) { res.status(404).json({ error: "Incident not found" }); return; }

    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(`data: ${JSON.stringify({ type: "start", message: "Initiating autonomous triage..." })}\n\n`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: "You are COMMANDER-0, an autonomous incident commander AI in a cybersecurity SOC. Perform rapid incident triage. Be concise, technical, and decisive. Format your response with clear sections: CLASSIFICATION, SEVERITY, SCOPE, IMMEDIATE ACTIONS (numbered), INDICATORS, and NEXT STEPS." },
        { role: "user", content: `Triage this incident:\nTitle: ${incident.title}\nType: ${incident.type}\nSeverity: ${incident.severity}\nDescription: ${incident.description}\nMITRE: ${incident.mitreTechnique ?? "Unknown"}\nIOCs: ${incident.iocIndicators ?? "None documented"}\nCurrent Status: ${incident.status}` },
      ],
      max_tokens: 800,
    });

    let fullContent = "";
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        fullContent += text;
        res.write(`data: ${JSON.stringify({ type: "token", text })}\n\n`);
      }
    }

    const [action] = await db.insert(autonomousActionsTable).values({
      type: "triage", title: `AI Triage: ${incident.title}`,
      description: `Autonomous triage of incident #${incidentId}`,
      status: "complete", incidentId, incidentTitle: incident.title,
      riskLevel: (incident.severity === "critical" ? "critical" : incident.severity === "high" ? "high" : "medium") as any,
      reasoning: "AI triage based on incident data, MITRE ATT&CK mapping, and IOC analysis.",
      result: fullContent, requiresApproval: false, confidence: 0.91, executedAt: new Date(),
    }).returning();

    res.write(`data: ${JSON.stringify({ type: "complete", actionId: action.id })}\n\n`);
    res.end();
  } catch (err) { req.log.error(err); if (!res.headersSent) res.status(500).json({ error: "Internal server error" }); else res.end(); }
});

router.get("/autonomous/briefings", requireAuth, async (req, res) => {
  try {
    const briefings = await db.select().from(aiBriefingsTable).orderBy(desc(aiBriefingsTable.generatedAt)).limit(10);
    res.json(briefings.map(b => ({ ...b, keyFindings: JSON.parse(b.keyFindings), recommendations: JSON.parse(b.recommendations), metrics: JSON.parse(b.metrics) })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/autonomous/briefings/generate", requireAuth, async (req, res) => {
  try {
    const [incidents, threats, detections] = await Promise.all([
      db.select().from(incidentsTable).orderBy(desc(incidentsTable.createdAt)).limit(20),
      db.select().from(threatsTable).orderBy(desc(threatsTable.createdAt)).limit(10),
      db.select().from(detectionsTable).orderBy(desc(detectionsTable.updatedAt)).limit(20),
    ]);

    const openIncidents = incidents.filter(i => i.status === "open").length;
    const criticalIncidents = incidents.filter(i => i.severity === "critical").length;
    const activeDetections = detections.filter(d => d.status === "active").length;

    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(`data: ${JSON.stringify({ type: "start" })}\n\n`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: "You are an executive security briefing generator for a CISO. Write concise, professional, board-ready security briefings. Use clear headings, bullet points. Focus on business impact and risk posture. Avoid technical jargon where possible." },
        { role: "user", content: `Generate a security briefing for the past week.\n\nKEY METRICS:\n- Open incidents: ${openIncidents} (${criticalIncidents} critical)\n- Total incidents tracked: ${incidents.length}\n- Active detections: ${activeDetections}/${detections.length}\n- Active threats: ${threats.filter(t => t.status === "active").length}\n\nRECENT INCIDENTS:\n${incidents.slice(0, 5).map(i => `• [${i.severity?.toUpperCase()}] ${i.title} — ${i.status}`).join("\n")}\n\nWrite a board-ready executive security briefing with: Executive Summary, Key Security Events, Risk Posture Assessment, Recommended Actions, and Looking Ahead.` },
      ],
      max_tokens: 1000,
    });

    let fullContent = "";
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) { fullContent += text; res.write(`data: ${JSON.stringify({ type: "token", text })}\n\n`); }
    }

    const now = new Date();
    const period = `Week of ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    const [briefing] = await db.insert(aiBriefingsTable).values({
      title: `Executive Security Briefing — ${period}`,
      period, content: fullContent,
      summary: fullContent.split("\n").slice(0, 3).join(" ").substring(0, 200),
      keyFindings: JSON.stringify([`${openIncidents} open incidents (${criticalIncidents} critical)`, `${activeDetections} active detections`, `${threats.filter(t => t.status === "active").length} active threat actors tracked`]),
      recommendations: JSON.stringify(["Review and action critical incidents", "Update detection coverage for gaps identified", "Brief executive team on ransomware risk posture"]),
      metrics: JSON.stringify({ openIncidents, criticalIncidents, activeDetections, totalDetections: detections.length }),
    }).returning();

    res.write(`data: ${JSON.stringify({ type: "complete", briefingId: briefing.id })}\n\n`);
    res.end();
  } catch (err) { req.log.error(err); if (!res.headersSent) res.status(500).json({ error: "Internal server error" }); else res.end(); }
});

export default router;
