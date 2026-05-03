import { Router } from "express";
import { db, ewsSignalsTable, ewsPredictionsTable, threatsTable, incidentsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const SEED_SIGNALS = [
  { signalType: "threat_intel", source: "OSINT Feed", title: "Pre-ransomware indicators surge", description: "340% increase in pre-ransomware IOCs (lateral movement, credential harvesting, shadow copy deletion) correlated with LockBit/Cl0p TTP signatures in last 48h", confidence: 89, severity: "critical" as const, category: "Ransomware", affectedAssets: 34 },
  { signalType: "ueba", source: "UEBA Engine", title: "Insider threat risk escalation", description: "3 users with combined anomaly score exceeding critical threshold — correlated with HR activity patterns and after-hours PII data access", confidence: 76, severity: "high" as const, category: "Insider Threat", affectedAssets: 3 },
  { signalType: "geo_threat", source: "Geo Intelligence", title: "Threat actor activity near supply chain vendor", description: "Known APT group EXOTIC LILY operating in regions where 2 of your software vendors are headquartered — vendor update anomaly detected", confidence: 63, severity: "high" as const, category: "Supply Chain", affectedAssets: 128 },
  { signalType: "detection_trend", source: "Detection Engine", title: "DDoS pre-staging indicators", description: "Network packet analysis shows IP sweep pattern consistent with DDoS botnet reconnaissance targeting public-facing infrastructure", confidence: 55, severity: "medium" as const, category: "DDoS", affectedAssets: 5 },
  { signalType: "threat_intel", source: "CVE Intelligence", title: "Critical zero-day exploitation campaign", description: "CVE-2024-8963 actively exploited in the wild — affects your stack version. 23 confirmed victims in your industry vertical in the past 72h", confidence: 91, severity: "critical" as const, category: "Zero-Day", affectedAssets: 12 },
  { signalType: "ueba", source: "UEBA Engine", title: "Credential compromise signal cluster", description: "Brute force attempts correlated with dark web credential dump matching 3 corporate email domains — likelihood of account takeover elevated", confidence: 72, severity: "high" as const, category: "Account Takeover", affectedAssets: 847 },
];

const SEED_PREDICTIONS = [
  { title: "Ransomware Campaign Probability Surge", threatCategory: "Ransomware", description: "ML models detect a 340% increase in pre-ransomware indicators across tenant assets — consistent with Cl0p & LockBit TTP signatures observed in threat intel feeds over the past 48h.", probability: 87, severity: "critical" as const, timeframe: "24–72 hours", evidenceSignals: JSON.stringify(["Lateral movement spikes (+340%)", "Credential harvesting tools detected", "C2 beaconing to known LockBit infrastructure", "Shadow copy deletion attempts"]), recommendation: "Immediately isolate high-value assets, enforce least-privilege, review backup integrity, and pre-stage IR team.", status: "active" as const, confidence: "High", affectedAssets: 34 },
  { title: "Insider Threat Escalation Risk", threatCategory: "Insider Threat", description: "UEBA models flagged three users with combined risk scores exceeding threshold. Correlated with recent HR activity and access pattern changes suggesting potential data exfiltration precursors.", probability: 73, severity: "high" as const, timeframe: "3–7 days", evidenceSignals: JSON.stringify(["Unusual after-hours access (3 users)", "PII export volume increase +280%", "New USB registrations on sensitive hosts", "Job posting search correlation"]), recommendation: "Increase DLP monitoring on flagged users, review access permissions, notify HR liaison.", status: "active" as const, confidence: "High", affectedAssets: 3 },
  { title: "Supply Chain Attack Vector Emerging", threatCategory: "Supply Chain", description: "A key third-party software vendor in your stack has been linked to a new threat campaign. 47% of similar organizations have been targeted in the last 14 days.", probability: 61, severity: "high" as const, timeframe: "7–14 days", evidenceSignals: JSON.stringify(["Vendor software unsigned update pushed", "Threat intel: vendor breach reported", "Anomalous network calls from vendor agent", "CISA advisory correlation"]), recommendation: "Sandbox vendor software updates, audit vendor access tokens, prepare rollback procedures.", status: "active" as const, confidence: "Medium", affectedAssets: 128 },
  { title: "DDoS Attack Window Predicted", threatCategory: "DDoS", description: "Network traffic pattern analysis and external threat intelligence suggest a targeted DDoS campaign is in the preparation phase targeting your public-facing infrastructure.", probability: 54, severity: "medium" as const, timeframe: "2–5 days", evidenceSignals: JSON.stringify(["IP sweep pattern on public IPs", "Botnet C2 traffic observed", "Similar organizations targeted recently"]), recommendation: "Activate DDoS scrubbing, coordinate with upstream ISP, test rate-limiting configs.", status: "active" as const, confidence: "Medium", affectedAssets: 5 },
  { title: "Credential Stuffing Campaign", threatCategory: "Account Takeover", description: "Dark web monitoring detected a fresh credential dump containing emails matching your domain. Active testing of credentials against your auth endpoints detected.", probability: 72, severity: "high" as const, timeframe: "12–48 hours", evidenceSignals: JSON.stringify(["Dark web dump with 847 matching emails", "Auth failure rate +420%", "Multiple source IPs targeting login endpoint", "Credential testing pattern (low/slow)"]), recommendation: "Force password reset for exposed accounts, enable MFA enforcement, rate-limit authentication endpoints.", status: "active" as const, confidence: "High", affectedAssets: 847 },
];

async function seedIfEmpty() {
  const existing = await db.select({ id: ewsPredictionsTable.id }).from(ewsPredictionsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(ewsSignalsTable).values(SEED_SIGNALS);
    await db.insert(ewsPredictionsTable).values(SEED_PREDICTIONS);
  }
}

router.get("/ews/signals", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const signals = await db.select().from(ewsSignalsTable)
      .where(eq(ewsSignalsTable.isActive, true))
      .orderBy(desc(ewsSignalsTable.confidence));
    res.json(signals);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ews/predictions", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const predictions = await db.select().from(ewsPredictionsTable)
      .where(eq(ewsPredictionsTable.status, "active"))
      .orderBy(desc(ewsPredictionsTable.probability));
    const result = predictions.map(p => ({ ...p, evidenceSignals: JSON.parse(p.evidenceSignals ?? "[]") }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ews/analyze", requireAuth, async (req, res) => {
  try {
    const [signals, threats, incidents] = await Promise.all([
      db.select().from(ewsSignalsTable).where(eq(ewsSignalsTable.isActive, true)),
      db.select().from(threatsTable),
      db.select().from(incidentsTable),
    ]);

    const criticalSignals = signals.filter(s => s.severity === "critical" || s.severity === "high");
    const avgConfidence   = signals.length > 0 ? Math.round(signals.reduce((s, sg) => s + sg.confidence, 0) / signals.length) : 50;
    const openIncidents   = incidents.filter(i => i.status === "open" || i.status === "investigating").length;
    const activeThreats   = threats.filter(t => t.status === "active").length;

    const probability = Math.min(95, Math.round(avgConfidence * 0.7 + criticalSignals.length * 5 + openIncidents * 2 + activeThreats * 1.5));
    const severity    = probability >= 80 ? "critical" : probability >= 60 ? "high" : probability >= 40 ? "medium" : "low";
    const confidence  = avgConfidence >= 75 ? "High" : avgConfidence >= 50 ? "Medium" : "Low";

    const topCategories = [...new Set(criticalSignals.map(s => s.category))].slice(0, 3);
    const evidence = signals.slice(0, 5).map(s => s.title);

    const [prediction] = await db.insert(ewsPredictionsTable).values({
      title:           `AI Composite Threat Assessment — ${new Date().toLocaleDateString()}`,
      threatCategory:  topCategories[0] ?? "Multi-Vector",
      description:     `AI analysis of ${signals.length} active signals, ${openIncidents} open incidents, and ${activeThreats} active threats indicates elevated composite risk. Top threat categories: ${topCategories.join(", ")}.`,
      probability,
      severity:        severity as any,
      timeframe:       probability >= 80 ? "12–48 hours" : probability >= 60 ? "3–7 days" : "7–14 days",
      evidenceSignals: JSON.stringify(evidence),
      recommendation:  `Prioritize response to ${topCategories[0] ?? "top"} threats. Activate incident response team. Review all ${criticalSignals.length} critical/high signals immediately.`,
      status:          "active",
      confidence,
      affectedAssets:  signals.reduce((s, sg) => s + sg.affectedAssets, 0),
    }).returning();

    res.status(201).json({ ...prediction, evidenceSignals: JSON.parse(prediction.evidenceSignals) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/ews/predictions/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  if (!["active","expired","confirmed","false_positive"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  try {
    const [updated] = await db.update(ewsPredictionsTable)
      .set({ status })
      .where(eq(ewsPredictionsTable.id, Number(req.params.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Prediction not found" }); return; }
    res.json({ ...updated, evidenceSignals: JSON.parse(updated.evidenceSignals ?? "[]") });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
