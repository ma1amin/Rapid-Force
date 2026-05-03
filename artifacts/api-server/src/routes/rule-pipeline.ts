import { Router } from "express";
import { db, ruleVersionsTable, ruleReviewsTable, detectionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const COMMUNITY_RULES = [
  { name: "Windows LSASS Memory Dump via ProcDump", type: "sigma", severity: "high", mitreTechnique: "T1003.001", mitreTactic: "Credential Access", description: "Detects credential dumping via Sysinternals ProcDump targeting lsass.exe", ruleContent: `title: LSASS Memory Dump via ProcDump\nstatus: stable\ndescription: Detects credential dumping via Sysinternals ProcDump targeting lsass.exe\nauthor: Florian Roth\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|endswith: '\\procdump.exe'\n    CommandLine|contains:\n      - 'lsass'\n  condition: selection\nlevel: high\ntags:\n  - attack.credential_access\n  - attack.t1003.001`, author: "Florian Roth (Nextron Systems)", tags: "lsass,credential-access,procdump" },
  { name: "PowerShell Download Cradle", type: "sigma", severity: "medium", mitreTechnique: "T1059.001", mitreTactic: "Execution", description: "Detects PowerShell command-line download cradles used for payload delivery", ruleContent: `title: PowerShell Download Cradle\nstatus: stable\ndescription: Detects PowerShell download cradles commonly used for payload delivery\nauthor: Harish Segar\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    CommandLine|contains:\n      - 'IEX (New-Object'\n      - 'IEX(New-Object'\n      - 'Invoke-Expression'\n  condition: selection\nlevel: medium\ntags:\n  - attack.execution\n  - attack.t1059.001`, author: "Harish Segar", tags: "powershell,execution,download" },
  { name: "Suspicious Scheduled Task Creation", type: "sigma", severity: "medium", mitreTechnique: "T1053.005", mitreTactic: "Persistence", description: "Detects suspicious scheduled task creation via schtasks.exe or PowerShell", ruleContent: `title: Suspicious Scheduled Task Creation\nstatus: stable\nauthor: Nasreddine Bencherchali\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    Image|endswith: '\\schtasks.exe'\n    CommandLine|contains:\n      - '/create'\n  filter:\n    CommandLine|contains:\n      - 'Microsoft'\n      - 'Windows'\n  condition: selection and not filter\nlevel: medium\ntags:\n  - attack.persistence\n  - attack.t1053.005`, author: "Nasreddine Bencherchali", tags: "persistence,scheduled-task,windows" },
  { name: "Mimikatz Command Line Indicators", type: "sigma", severity: "critical", mitreTechnique: "T1003.001", mitreTactic: "Credential Access", description: "Detects common Mimikatz command-line arguments used for credential dumping", ruleContent: `title: Mimikatz Command Line Indicators\nstatus: stable\nauthor: Florian Roth\nlogsource:\n  category: process_creation\n  product: windows\ndetection:\n  selection:\n    CommandLine|contains:\n      - 'sekurlsa::'\n      - 'lsadump::'\n      - 'kerberos::'\n      - 'privilege::debug'\n      - 'crypto::capi'\n  condition: selection\nlevel: critical\ntags:\n  - attack.credential_access\n  - attack.t1003.001`, author: "Florian Roth (Nextron Systems)", tags: "mimikatz,credential-access,critical" },
  { name: "Cobalt Strike Beacon Malleable Profile", type: "yara", severity: "critical", mitreTechnique: "T1071.001", mitreTactic: "Command and Control", description: "Detects Cobalt Strike beacon communication patterns in network captures", ruleContent: `rule CobaltStrike_Beacon {\n  meta:\n    description = "Detects Cobalt Strike beacon in memory"\n    author = "Rapid Force Labs"\n    date = "2024-01-15"\n    severity = "critical"\n    mitre_technique = "T1071.001"\n  strings:\n    $cs1 = { 68 65 61 64 65 72 73 2E 61 63 63 65 70 74 }\n    $cs2 = "ReflectivLoader" ascii\n    $cs3 = { 4D 5A 90 00 03 00 00 00 04 00 00 00 FF FF }\n    $pipe = "\\\\.\\pipe\\msagent_"\n  condition:\n    ($cs1 and $cs2) or ($cs3 and $pipe)\n}`, author: "Rapid Force Labs", tags: "cobalt-strike,c2,beacon" },
  { name: "Lateral Movement via SMB Named Pipe", type: "sigma", severity: "high", mitreTechnique: "T1021.002", mitreTactic: "Lateral Movement", description: "Detects lateral movement using SMB named pipes commonly abused by threat actors", ruleContent: `title: Lateral Movement via SMB Named Pipe\nstatus: experimental\nauthor: Rapid Force Labs\nlogsource:\n  product: windows\n  service: security\ndetection:\n  selection:\n    EventID: 5145\n    ShareName: '\\\\*\\IPC$'\n    RelativeTargetName|contains:\n      - 'msagent'\n      - 'status_'\n      - 'mojo.'\n      - 'wkssvc'\n  condition: selection\nlevel: high\ntags:\n  - attack.lateral_movement\n  - attack.t1021.002`, author: "Rapid Force Labs", tags: "lateral-movement,smb,named-pipe" },
];

async function getOrCreateVersion(detectionId: number) {
  const [existing] = await db.select().from(ruleVersionsTable)
    .where(and(eq(ruleVersionsTable.detectionId, detectionId), eq(ruleVersionsTable.isCurrent, true)));
  if (existing) return existing;
  const [detection] = await db.select().from(detectionsTable).where(eq(detectionsTable.id, detectionId));
  if (!detection) return null;
  const [version] = await db.insert(ruleVersionsTable).values({
    detectionId,
    version: detection.version ?? "1.0",
    ruleContent: detection.ruleContent,
    stage: detection.status === "active" ? "production" : detection.status === "testing" ? "test" : "draft",
    author: detection.author ?? "system",
    changelog: "Initial version",
    isCurrent: true,
  }).returning();
  return version;
}

router.get("/rule-pipeline/board", requireAuth, async (req, res) => {
  try {
    const detections = await db.select().from(detectionsTable).orderBy(desc(detectionsTable.updatedAt));
    const result: Record<string, typeof detections> = { draft: [], review: [], test: [], production: [] };
    for (const d of detections) {
      const col = d.status === "active" ? "production" : d.status === "testing" ? "test" : d.status === "review" ? "review" : "draft";
      result[col].push(d);
    }
    res.json(result);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/rule-pipeline/:id/advance", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [detection] = await db.select().from(detectionsTable).where(eq(detectionsTable.id, id));
    if (!detection) { res.status(404).json({ error: "Detection not found" }); return; }
    const stageMap: Record<string, string> = { disabled: "testing", review: "testing", testing: "active", active: "active" };
    const nextStatus = stageMap[detection.status] ?? "testing";
    const [updated] = await db.update(detectionsTable).set({ status: nextStatus as any, updatedAt: new Date() }).where(eq(detectionsTable.id, id)).returning();
    const version = await getOrCreateVersion(id);
    if (version) {
      const stageLabel = nextStatus === "active" ? "production" : nextStatus === "testing" ? "test" : "review";
      await db.update(ruleVersionsTable).set({ stage: stageLabel as any, isCurrent: true }).where(eq(ruleVersionsTable.id, version.id));
    }
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/rule-pipeline/:id/versions", requireAuth, async (req, res) => {
  try {
    const versions = await db.select().from(ruleVersionsTable)
      .where(eq(ruleVersionsTable.detectionId, Number(req.params.id)))
      .orderBy(desc(ruleVersionsTable.createdAt));
    res.json(versions);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/rule-pipeline/:id/version", requireAuth, async (req, res) => {
  try {
    const { ruleContent, changelog, author } = req.body;
    const id = Number(req.params.id);
    await db.update(ruleVersionsTable).set({ isCurrent: false }).where(eq(ruleVersionsTable.detectionId, id));
    const [detection] = await db.select().from(detectionsTable).where(eq(detectionsTable.id, id));
    if (!detection) { res.status(404).json({ error: "Detection not found" }); return; }
    const parts = (detection.version ?? "1.0").split(".").map(Number);
    parts[1] = (parts[1] ?? 0) + 1;
    const newVersion = parts.join(".");
    const [v] = await db.insert(ruleVersionsTable).values({ detectionId: id, version: newVersion, ruleContent, stage: "draft", changelog: changelog ?? "Rule updated", author: author ?? "SOC Analyst", isCurrent: true }).returning();
    await db.update(detectionsTable).set({ ruleContent, version: newVersion, status: "disabled", updatedAt: new Date() }).where(eq(detectionsTable.id, id));
    res.status(201).json(v);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/rule-pipeline/community", requireAuth, async (_req, res) => {
  res.json(COMMUNITY_RULES);
});

export default router;
