import { Router } from "express";
import { db, pluginsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const SEED_PLUGINS = [
  { name: "Slack", slug: "slack", description: "Send real-time SOC alerts, incident notifications, and AI briefings directly to Slack channels.", longDesc: "Integrate Rapid Force with your Slack workspace to deliver real-time security alerts, incident updates, playbook execution notifications, and AI-generated briefings to designated channels. Supports thread-based conversations and interactive approve/reject buttons for human-in-the-loop workflows.", author: "Slack Technologies", version: "2.4.1", category: "notification" as const, icon: "slack", capabilities: JSON.stringify(["Send alert notifications", "Incident channel creation", "Interactive approval buttons", "Daily briefing delivery", "Threat intel sharing"]), isBuiltIn: true, installCount: 8420, rating: 48, reviewCount: 312 },
  { name: "PagerDuty", slug: "pagerduty", description: "Auto-escalate critical incidents to on-call responders with full incident context and severity routing.", longDesc: "Route critical incidents and EWS predictions directly to PagerDuty on-call schedules. Supports severity-based routing, auto-resolve on containment, and bi-directional sync of incident status between Rapid Force and PagerDuty.", author: "PagerDuty Inc.", version: "3.1.0", category: "ir_tools" as const, icon: "bell", capabilities: JSON.stringify(["On-call escalation", "Severity routing", "Auto-resolve sync", "Incident bi-directional sync", "Runbook linking"]), isBuiltIn: true, installCount: 6103, rating: 47, reviewCount: 218 },
  { name: "Jira", slug: "jira", description: "Auto-create Jira tickets for incidents and vulnerabilities with MITRE ATT&CK mapping and evidence.", longDesc: "Automatically create, update, and close Jira issues from Rapid Force incidents and playbook executions. Maps MITRE ATT&CK techniques to issue labels, attaches forensic evidence, and tracks remediation SLAs.", author: "Atlassian", version: "4.0.2", category: "ticketing" as const, icon: "ticket", capabilities: JSON.stringify(["Auto ticket creation", "MITRE technique labeling", "Evidence attachment", "SLA tracking", "Status bi-sync"]), isBuiltIn: true, installCount: 11237, rating: 46, reviewCount: 489 },
  { name: "ServiceNow", slug: "servicenow", description: "Enterprise ITSM integration for incident ticket creation, CMDB asset sync, and change management workflows.", longDesc: "Enterprise-grade ServiceNow integration for creating and updating security incidents in the CMDB, syncing asset inventory with the Rapid Force asset database, and triggering change management workflows for remediation actions.", author: "ServiceNow", version: "2.8.0", category: "ticketing" as const, icon: "layers", capabilities: JSON.stringify(["CMDB asset sync", "Incident ticket creation", "Change management trigger", "SLA enforcement", "Knowledge article linking"]), isBuiltIn: false, installCount: 4891, rating: 45, reviewCount: 176 },
  { name: "VirusTotal", slug: "virustotal", description: "Automatic IOC enrichment with VirusTotal multi-engine scanning for hashes, IPs, domains, and URLs.", longDesc: "Enrich every IOC ingested by Rapid Force with VirusTotal intelligence — file hashes, IP addresses, domains, and URLs are automatically scanned across 70+ AV engines. Results feed back into threat scoring and detection rules.", author: "Google Chronicle", version: "1.5.3", category: "threat_intel" as const, icon: "search", capabilities: JSON.stringify(["Hash/IP/domain/URL scan", "Multi-engine results", "IOC risk scoring", "Malware family identification", "Feed enrichment"]), isBuiltIn: true, installCount: 15603, rating: 49, reviewCount: 702 },
  { name: "CrowdStrike Falcon", slug: "crowdstrike", description: "Deep EDR integration for real-time endpoint telemetry, process trees, and one-click containment.", longDesc: "Connect Rapid Force to CrowdStrike Falcon for full EDR visibility — receive endpoint detections, pull process trees and memory dumps for forensics, and execute containment actions (host isolation, process kill) directly from incident response workflows.", author: "CrowdStrike", version: "5.2.0", category: "ir_tools" as const, icon: "shield", capabilities: JSON.stringify(["Endpoint detection ingestion", "Process tree visualization", "Host isolation", "RTR script execution", "Threat graph correlation"]), isBuiltIn: false, installCount: 9847, rating: 49, reviewCount: 521 },
  { name: "Splunk SIEM", slug: "splunk", description: "Bidirectional Splunk integration for alert ingestion, SPL query execution, and data export.", longDesc: "Ingest Splunk alerts and notable events into Rapid Force as incidents, execute SPL queries for threat hunting, and export investigation results back to Splunk for long-term retention. Supports both Splunk Cloud and on-premises deployments.", author: "Splunk Inc.", version: "3.7.1", category: "siem" as const, icon: "database", capabilities: JSON.stringify(["Alert ingestion", "SPL query execution", "Notable event sync", "Saved search trigger", "Data export"]), isBuiltIn: false, installCount: 7234, rating: 47, reviewCount: 298 },
  { name: "AWS Security Hub", slug: "aws-security-hub", description: "Aggregate AWS Security Hub findings from GuardDuty, Inspector, and Macie into Rapid Force.", longDesc: "Centralize AWS security findings from GuardDuty, Inspector, Macie, IAM Access Analyzer, and third-party integrations into Rapid Force. Auto-maps findings to MITRE ATT&CK and creates incidents for critical findings.", author: "Amazon Web Services", version: "2.1.4", category: "cloud_security" as const, icon: "cloud", capabilities: JSON.stringify(["GuardDuty finding ingestion", "Inspector vulnerability sync", "Macie DLP alerts", "MITRE mapping", "Multi-account aggregation"]), isBuiltIn: false, installCount: 5621, rating: 46, reviewCount: 203 },
  { name: "Microsoft Sentinel", slug: "ms-sentinel", description: "Ingest Microsoft Sentinel incidents and UEBA alerts with full KQL query support.", longDesc: "Connect to Microsoft Sentinel for bidirectional incident sync, KQL query execution for threat hunting, and UEBA alert ingestion. Supports Azure AD identity risk signals and Microsoft Defender for Endpoint telemetry.", author: "Microsoft", version: "4.3.0", category: "siem" as const, icon: "monitor", capabilities: JSON.stringify(["Incident bi-sync", "KQL query execution", "UEBA alert ingestion", "Azure AD risk signals", "Defender telemetry"]), isBuiltIn: false, installCount: 6893, rating: 47, reviewCount: 334 },
  { name: "Okta", slug: "okta", description: "Identity risk signals, suspicious login detection, and automated account lockout from Okta.", longDesc: "Integrate Okta identity signals into Rapid Force for real-time suspicious login detection, geo-impossible travel alerts, MFA bypass attempts, and automated account lockout actions through playbooks and autonomous response.", author: "Okta Inc.", version: "2.6.0", category: "identity" as const, icon: "key", capabilities: JSON.stringify(["Suspicious login signals", "Geo-impossible travel", "MFA bypass detection", "Auto account lockout", "Session revocation"]), isBuiltIn: false, installCount: 8102, rating: 48, reviewCount: 411 },
  { name: "Tenable Nessus", slug: "tenable", description: "Vulnerability scan results and asset risk scoring synced directly into Rapid Force.", longDesc: "Import Tenable vulnerability scan results into Rapid Force asset risk scores. Correlate vulnerabilities with active threats and incidents, prioritize remediation using real-world exploitation data, and auto-create tickets for critical CVEs.", author: "Tenable Inc.", version: "3.2.1", category: "vulnerability" as const, icon: "alert-triangle", capabilities: JSON.stringify(["Vulnerability import", "Asset risk scoring", "CVE correlation", "Exploit likelihood scoring", "Remediation ticket creation"]), isBuiltIn: false, installCount: 4312, rating: 45, reviewCount: 167 },
  { name: "TheHive", slug: "thehive", description: "Open-source IR platform integration for case management, observable sharing, and Cortex analyzer results.", longDesc: "Bridge Rapid Force with TheHive for collaborative incident case management. Share observables (IOCs) between platforms, trigger Cortex analyzers, and sync case status for cross-team IR workflows.", author: "StrangeBee", version: "1.8.2", category: "ir_tools" as const, icon: "git-branch", capabilities: JSON.stringify(["Case sync", "Observable sharing", "Cortex analyzer trigger", "MISP integration relay", "Analyst collaboration"]), isBuiltIn: false, installCount: 3187, rating: 44, reviewCount: 98 },
];

async function seedIfEmpty() {
  const existing = await db.select({ id: pluginsTable.id }).from(pluginsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(pluginsTable).values(SEED_PLUGINS);
  }
}

router.get("/plugins", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const plugins = await db.select().from(pluginsTable).orderBy(desc(pluginsTable.installCount));
    res.json(plugins.map(p => ({ ...p, capabilities: JSON.parse(p.capabilities) })));
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/plugins/:slug/install", requireAuth, async (req, res) => {
  try {
    await seedIfEmpty();
    const [plugin] = await db.select().from(pluginsTable).where(eq(pluginsTable.slug, req.params.slug));
    if (!plugin) { res.status(404).json({ error: "Plugin not found" }); return; }
    const [updated] = await db.update(pluginsTable)
      .set({ isInstalled: true, isEnabled: true, installCount: plugin.installCount + 1, updatedAt: new Date() })
      .where(eq(pluginsTable.slug, req.params.slug))
      .returning();
    res.json({ ...updated, capabilities: JSON.parse(updated.capabilities) });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/plugins/:slug/uninstall", requireAuth, async (req, res) => {
  try {
    const [updated] = await db.update(pluginsTable)
      .set({ isInstalled: false, isEnabled: false, updatedAt: new Date() })
      .where(eq(pluginsTable.slug, req.params.slug))
      .returning();
    if (!updated) { res.status(404).json({ error: "Plugin not found" }); return; }
    res.json({ ...updated, capabilities: JSON.parse(updated.capabilities) });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/plugins/:slug/toggle", requireAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    const [updated] = await db.update(pluginsTable)
      .set({ isEnabled: enabled, updatedAt: new Date() })
      .where(eq(pluginsTable.slug, req.params.slug))
      .returning();
    if (!updated) { res.status(404).json({ error: "Plugin not found" }); return; }
    res.json({ ...updated, capabilities: JSON.parse(updated.capabilities) });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
