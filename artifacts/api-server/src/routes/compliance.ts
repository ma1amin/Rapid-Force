import { Router } from "express";
import { db, moduleLicensesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const TIER_MODULES: Record<string, string[]> = {
  trial:        ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel"],
  starter:      ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions"],
  professional: ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions", "detection_eng", "incidents", "adversarial_sim", "threat_hunting"],
  enterprise:   ["command_center", "agent_fleet", "event_log", "ai_copilot", "threat_intel", "sprint_ops", "missions", "detection_eng", "incidents", "adversarial_sim", "threat_hunting", "compliance", "behavioral_analytics", "playbooks", "executive", "early_warning", "license_admin"],
};

async function getActiveModules(tenantId: number, tier: string): Promise<string[]> {
  const defaults = new Set<string>(TIER_MODULES[tier] ?? []);
  const overrides = await db.select().from(moduleLicensesTable).where(eq(moduleLicensesTable.tenantId, tenantId));
  for (const o of overrides) {
    if (o.enabled) defaults.add(o.moduleKey);
    else defaults.delete(o.moduleKey);
  }
  return Array.from(defaults);
}

interface Control {
  id: string;
  title: string;
  description: string;
  category: string;
  modules: string[];
}

interface Framework {
  key: string;
  name: string;
  shortName: string;
  version: string;
  description: string;
  controls: Control[];
}

const FRAMEWORKS: Framework[] = [
  {
    key: "nist_csf",
    name: "NIST Cybersecurity Framework",
    shortName: "NIST CSF",
    version: "2.0",
    description: "NIST CSF 2.0 provides a framework for reducing cybersecurity risk through six core functions: Govern, Identify, Protect, Detect, Respond, and Recover.",
    controls: [
      { id: "GV.OC-01", title: "Organizational Context", description: "Mission, stakeholder expectations, dependencies, and risk tolerance are understood", category: "Govern", modules: ["command_center"] },
      { id: "GV.RR-01", title: "Roles & Responsibilities", description: "Organizational cybersecurity roles and responsibilities are established", category: "Govern", modules: ["agent_fleet", "command_center"] },
      { id: "ID.AM-01", title: "Asset Inventory", description: "Assets are inventoried that need protection", category: "Identify", modules: ["command_center", "agent_fleet"] },
      { id: "ID.AM-02", title: "Software Inventory", description: "Software, services, and systems are inventoried", category: "Identify", modules: ["command_center", "agent_fleet"] },
      { id: "ID.RA-01", title: "Vulnerability Identification", description: "Vulnerabilities in assets are identified, validated, and recorded", category: "Identify", modules: ["threat_intel", "detection_eng"] },
      { id: "ID.RA-02", title: "Threat Intelligence", description: "Cyber threat intelligence is received from sources to inform decisions", category: "Identify", modules: ["threat_intel"] },
      { id: "ID.RA-06", title: "Risk Response", description: "Risk responses are chosen and prioritized", category: "Identify", modules: ["threat_intel", "adversarial_sim", "incidents"] },
      { id: "PR.AA-01", title: "Access Control", description: "Identities and credentials are managed for authorized users and services", category: "Protect", modules: ["command_center"] },
      { id: "PR.AT-01", title: "Security Awareness", description: "Personnel are provided awareness and training so they possess security skills", category: "Protect", modules: ["agent_fleet"] },
      { id: "PR.DS-01", title: "Data Security", description: "Data-at-rest is protected", category: "Protect", modules: ["command_center"] },
      { id: "PR.IP-01", title: "Baseline Configuration", description: "Baseline configurations are established and maintained", category: "Protect", modules: ["sprint_ops", "detection_eng"] },
      { id: "PR.IR-01", title: "Response Plans", description: "Response plans are established and communicated", category: "Protect", modules: ["incidents", "command_center"] },
      { id: "DE.AE-02", title: "Anomaly Analysis", description: "Potentially adverse events are analyzed to characterize them", category: "Detect", modules: ["threat_intel", "detection_eng", "threat_hunting"] },
      { id: "DE.AE-04", title: "Impact Estimation", description: "The estimated impact of adverse events is understood", category: "Detect", modules: ["incidents", "threat_intel"] },
      { id: "DE.CM-01", title: "Network Monitoring", description: "Networks and network services are monitored to find adverse events", category: "Detect", modules: ["detection_eng", "event_log"] },
      { id: "DE.CM-03", title: "User Activity Monitoring", description: "Personnel activity and behavior are monitored to find adverse events", category: "Detect", modules: ["event_log", "threat_hunting"] },
      { id: "DE.CM-09", title: "Computing Hardware Monitoring", description: "Computing hardware and software are monitored to find adverse events", category: "Detect", modules: ["detection_eng", "agent_fleet"] },
      { id: "DE.DP-01", title: "Detection Processes", description: "Detection processes and procedures are maintained and tested", category: "Detect", modules: ["detection_eng", "adversarial_sim"] },
      { id: "RS.MA-01", title: "Incident Management", description: "Incidents are contained, eradicated, and recovered from", category: "Respond", modules: ["incidents"] },
      { id: "RS.CO-02", title: "Incident Reporting", description: "Incidents are reported to internal and external stakeholders", category: "Respond", modules: ["incidents", "command_center"] },
      { id: "RS.AN-03", title: "Root Cause Analysis", description: "Root causes of incidents are established", category: "Respond", modules: ["incidents", "threat_hunting"] },
      { id: "RS.MI-01", title: "Incident Mitigation", description: "Incidents are contained", category: "Respond", modules: ["incidents", "detection_eng"] },
      { id: "RC.RP-01", title: "Recovery Planning", description: "Recovery plans incorporate lessons learned", category: "Recover", modules: ["incidents", "sprint_ops"] },
      { id: "RC.CO-03", title: "Recovery Communications", description: "Recovery activities are communicated to stakeholders", category: "Recover", modules: ["command_center", "incidents"] },
    ],
  },
  {
    key: "iso_27001",
    name: "ISO/IEC 27001:2022",
    shortName: "ISO 27001",
    version: "2022",
    description: "ISO/IEC 27001:2022 is the international standard for information security management systems (ISMS), specifying requirements for establishing, implementing, maintaining, and continually improving an ISMS.",
    controls: [
      { id: "A.5.1",  title: "Policies for Information Security", description: "Information security policy defined, approved, and communicated", category: "Organizational", modules: ["command_center"] },
      { id: "A.5.2",  title: "Information Security Roles", description: "Security responsibilities defined and allocated", category: "Organizational", modules: ["agent_fleet", "command_center"] },
      { id: "A.5.7",  title: "Threat Intelligence", description: "Threat intelligence is collected, analyzed, and shared", category: "Organizational", modules: ["threat_intel"] },
      { id: "A.5.25", title: "Incident Management", description: "Assessment and decision on information security events", category: "Organizational", modules: ["incidents"] },
      { id: "A.5.26", title: "Response to Incidents", description: "Incidents responded to in accordance with documented procedures", category: "Organizational", modules: ["incidents"] },
      { id: "A.5.37", title: "Documented Operating Procedures", description: "Operating procedures are documented and made available", category: "Organizational", modules: ["sprint_ops", "missions"] },
      { id: "A.7.2",  title: "Information Security Awareness", description: "Personnel receive awareness education and security training", category: "People", modules: ["agent_fleet"] },
      { id: "A.8.7",  title: "Protection Against Malware", description: "Appropriate protection against malware implemented and supported", category: "Technological", modules: ["detection_eng", "threat_hunting"] },
      { id: "A.8.8",  title: "Vulnerability Management", description: "Technical vulnerabilities are identified and remediated", category: "Technological", modules: ["threat_intel", "detection_eng", "adversarial_sim"] },
      { id: "A.8.9",  title: "Configuration Management", description: "Security configurations established, documented, and monitored", category: "Technological", modules: ["sprint_ops", "detection_eng"] },
      { id: "A.8.15", title: "Logging", description: "Logs that record activities, exceptions, and events are produced, stored, and analyzed", category: "Technological", modules: ["event_log", "detection_eng"] },
      { id: "A.8.16", title: "Monitoring Activities", description: "Networks, systems and applications monitored for anomalous behavior", category: "Technological", modules: ["detection_eng", "event_log", "threat_hunting"] },
      { id: "A.8.20", title: "Network Security", description: "Networks and network devices are secured, managed and controlled", category: "Technological", modules: ["detection_eng", "threat_intel"] },
      { id: "A.8.25", title: "Secure Development Life Cycle", description: "Security integrated in software development and acquisition", category: "Technological", modules: ["sprint_ops", "detection_eng"] },
      { id: "A.8.29", title: "Security Testing in Development", description: "Security testing conducted during development and acceptance", category: "Technological", modules: ["adversarial_sim", "detection_eng"] },
      { id: "A.8.34", title: "Protection of Info Systems During Audit", description: "Auditing controls planned and coordinated to minimize disruption", category: "Technological", modules: ["event_log", "command_center"] },
    ],
  },
  {
    key: "cis_controls",
    name: "CIS Critical Security Controls",
    shortName: "CIS Controls",
    version: "v8",
    description: "CIS Controls v8 is a prioritized set of 18 safeguards that help defend against common cyberattacks. Controls are organized into Implementation Groups (IG1, IG2, IG3).",
    controls: [
      { id: "CIS-01", title: "Inventory & Control of Enterprise Assets", description: "Actively manage all enterprise assets with visibility across the environment", category: "Basic", modules: ["command_center", "agent_fleet"] },
      { id: "CIS-02", title: "Inventory & Control of Software Assets", description: "Actively manage authorized and unauthorized software", category: "Basic", modules: ["command_center", "agent_fleet"] },
      { id: "CIS-03", title: "Data Protection", description: "Develop processes to identify, classify, and securely handle data", category: "Basic", modules: ["command_center", "detection_eng"] },
      { id: "CIS-04", title: "Secure Configuration", description: "Establish and maintain secure configuration of enterprise assets", category: "Basic", modules: ["sprint_ops", "detection_eng"] },
      { id: "CIS-06", title: "Access Control Management", description: "Use processes and tools to create, assign, manage, and revoke access", category: "Basic", modules: ["command_center"] },
      { id: "CIS-07", title: "Continuous Vulnerability Management", description: "Develop a plan to assess and track vulnerabilities", category: "Foundational", modules: ["threat_intel", "detection_eng", "adversarial_sim"] },
      { id: "CIS-08", title: "Audit Log Management", description: "Collect, alert, review, and retain audit logs to detect anomalies", category: "Foundational", modules: ["event_log", "detection_eng"] },
      { id: "CIS-10", title: "Malware Defenses", description: "Prevent or control installation, spread, and execution of malicious code", category: "Foundational", modules: ["detection_eng", "threat_hunting"] },
      { id: "CIS-11", title: "Data Recovery", description: "Establish and maintain data recovery practices", category: "Foundational", modules: ["incidents", "sprint_ops"] },
      { id: "CIS-13", title: "Network Monitoring & Defense", description: "Operate processes and tools to monitor and defend network infrastructure", category: "Foundational", modules: ["detection_eng", "threat_hunting", "event_log"] },
      { id: "CIS-16", title: "Application Software Security", description: "Manage the security lifecycle of in-house developed software", category: "Organizational", modules: ["sprint_ops", "adversarial_sim"] },
      { id: "CIS-17", title: "Incident Response Management", description: "Establish a program to develop and maintain an incident response capability", category: "Organizational", modules: ["incidents", "command_center"] },
      { id: "CIS-18", title: "Penetration Testing", description: "Test the effectiveness of controls via a program of simulated attacks", category: "Organizational", modules: ["adversarial_sim", "threat_hunting"] },
    ],
  },
  {
    key: "soc2",
    name: "SOC 2 Type II",
    shortName: "SOC 2",
    version: "2022",
    description: "SOC 2 Type II examines five Trust Service Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. It validates that controls operate effectively over a defined period.",
    controls: [
      { id: "CC1.1", title: "Control Environment — Commitment", description: "Entity demonstrates commitment to integrity and ethical values", category: "Common Criteria", modules: ["command_center", "agent_fleet"] },
      { id: "CC1.4", title: "Control Environment — Accountability", description: "Entity holds individuals accountable for security objectives", category: "Common Criteria", modules: ["agent_fleet", "event_log"] },
      { id: "CC2.1", title: "Information & Communication", description: "Entity obtains and uses relevant information to support internal controls", category: "Common Criteria", modules: ["command_center", "event_log"] },
      { id: "CC3.1", title: "Risk Assessment — Objectives", description: "Entity specifies objectives to identify and assess risks", category: "Common Criteria", modules: ["threat_intel", "command_center"] },
      { id: "CC3.2", title: "Risk Assessment — Identification", description: "Entity identifies risks to the achievement of objectives", category: "Common Criteria", modules: ["threat_intel", "detection_eng"] },
      { id: "CC4.1", title: "Monitoring Activities", description: "Entity selects, develops, and performs ongoing evaluations", category: "Common Criteria", modules: ["detection_eng", "event_log", "adversarial_sim"] },
      { id: "CC5.3", title: "Control Activities — Policies", description: "Management uses relevant information to communicate control expectations", category: "Common Criteria", modules: ["sprint_ops", "command_center"] },
      { id: "CC6.1", title: "Logical Access Security", description: "Entity implements logical access controls to protect system resources", category: "Logical & Physical", modules: ["command_center"] },
      { id: "CC6.6", title: "External Threats Prevention", description: "Entity implements controls to prevent external threats from accessing system resources", category: "Logical & Physical", modules: ["detection_eng", "threat_intel", "threat_hunting"] },
      { id: "CC6.8", title: "Unauthorized Software Prevention", description: "Controls prevent unauthorized or malicious software", category: "Logical & Physical", modules: ["detection_eng", "threat_hunting"] },
      { id: "CC7.1", title: "System Monitoring", description: "Detection and monitoring tools identify vulnerabilities and threats", category: "System Operations", modules: ["detection_eng", "threat_hunting", "event_log"] },
      { id: "CC7.2", title: "Anomaly Detection", description: "Ongoing monitoring of system components for anomalies", category: "System Operations", modules: ["detection_eng", "threat_hunting"] },
      { id: "CC7.3", title: "Incident Evaluation", description: "Security events are evaluated to determine whether they constitute incidents", category: "System Operations", modules: ["incidents", "detection_eng"] },
      { id: "CC7.4", title: "Incident Response", description: "Identified incidents are responded to in accordance with procedures", category: "System Operations", modules: ["incidents"] },
      { id: "CC7.5", title: "Incident Recovery", description: "Incidents are mitigated; recovery is supported", category: "System Operations", modules: ["incidents", "sprint_ops"] },
      { id: "CC8.1", title: "Change Management", description: "Entity authorizes, designs, and implements changes to infrastructure", category: "Change Management", modules: ["sprint_ops", "missions"] },
    ],
  },
  {
    key: "hipaa",
    name: "HIPAA Security Rule",
    shortName: "HIPAA",
    version: "2024",
    description: "HIPAA Security Rule establishes national standards for protecting electronic protected health information (ePHI) through Administrative, Physical, and Technical Safeguards.",
    controls: [
      { id: "164.308(a)(1)", title: "Security Management Process", description: "Risk analysis, risk management, sanction policy, and information system activity review", category: "Administrative", modules: ["threat_intel", "command_center", "event_log"] },
      { id: "164.308(a)(3)", title: "Workforce Security", description: "Authorization, supervision, clearance, and termination procedures", category: "Administrative", modules: ["agent_fleet", "command_center"] },
      { id: "164.308(a)(5)", title: "Security Awareness & Training", description: "Security reminders, malicious software protection, log-in monitoring, password management", category: "Administrative", modules: ["agent_fleet", "detection_eng", "event_log"] },
      { id: "164.308(a)(6)", title: "Security Incident Procedures", description: "Response and reporting of security incidents", category: "Administrative", modules: ["incidents"] },
      { id: "164.308(a)(7)", title: "Contingency Plan", description: "Data backup, disaster recovery, emergency mode, testing and revision", category: "Administrative", modules: ["incidents", "sprint_ops"] },
      { id: "164.308(a)(8)", title: "Evaluation", description: "Periodic technical and non-technical evaluation of safeguards", category: "Administrative", modules: ["adversarial_sim", "detection_eng"] },
      { id: "164.312(a)(1)", title: "Access Controls", description: "Unique user identification, emergency access procedure, automatic logoff, encryption", category: "Technical", modules: ["command_center"] },
      { id: "164.312(b)",    title: "Audit Controls", description: "Hardware, software, and procedural mechanisms to record and examine access", category: "Technical", modules: ["event_log", "detection_eng"] },
      { id: "164.312(c)(1)", title: "Integrity", description: "Protect ePHI from improper alteration or destruction", category: "Technical", modules: ["detection_eng", "command_center"] },
      { id: "164.312(e)(1)", title: "Transmission Security", description: "Guard against unauthorized access to ePHI during transmission", category: "Technical", modules: ["detection_eng", "command_center"] },
    ],
  },
  {
    key: "cmmc",
    name: "CMMC 2.0 Level 2",
    shortName: "CMMC",
    version: "2.0 L2",
    description: "CMMC 2.0 Level 2 aligns with NIST SP 800-171 and requires compliance with 110 practices to protect Controlled Unclassified Information (CUI) for DoD contractors.",
    controls: [
      { id: "AC.L2-3.1.1",  title: "Authorized Access Control", description: "Limit system access to authorized users and processes", category: "Access Control", modules: ["command_center"] },
      { id: "AC.L2-3.1.12", title: "Control Remote Access", description: "Monitor and control remote access sessions", category: "Access Control", modules: ["detection_eng", "event_log"] },
      { id: "AU.L2-3.3.1",  title: "System Auditing", description: "Create and retain system audit logs to monitor, analyze, investigate, and report unlawful activity", category: "Audit & Accountability", modules: ["event_log", "detection_eng"] },
      { id: "AU.L2-3.3.2",  title: "User Accountability", description: "Ensure actions of individual users can be traced to them", category: "Audit & Accountability", modules: ["event_log", "agent_fleet"] },
      { id: "CA.L2-3.12.1", title: "Security Assessments", description: "Periodically assess controls to determine if effective", category: "Assessment", modules: ["adversarial_sim", "detection_eng"] },
      { id: "CA.L2-3.12.3", title: "Security Control Monitoring", description: "Monitor security controls on an ongoing basis to ensure effectiveness", category: "Assessment", modules: ["detection_eng", "threat_hunting"] },
      { id: "CM.L2-3.4.1",  title: "Baseline Configuration", description: "Establish and maintain baseline configurations for IT systems", category: "Configuration", modules: ["sprint_ops", "detection_eng"] },
      { id: "IA.L2-3.5.2",  title: "Device Identification", description: "Authenticate devices before allowing access to systems", category: "Identification", modules: ["command_center", "agent_fleet"] },
      { id: "IR.L2-3.6.1",  title: "Incident Handling", description: "Establish an operational incident-handling capability for systems", category: "Incident Response", modules: ["incidents"] },
      { id: "IR.L2-3.6.2",  title: "Incident Reporting", description: "Track, document, and report incidents", category: "Incident Response", modules: ["incidents", "event_log"] },
      { id: "RA.L2-3.11.1", title: "Risk Assessments", description: "Periodically assess the risk to operations from system operation", category: "Risk Assessment", modules: ["threat_intel", "adversarial_sim"] },
      { id: "SI.L2-3.14.2", title: "Malicious Code Protection", description: "Provide protection from malicious code at appropriate locations", category: "System Integrity", modules: ["detection_eng", "threat_hunting"] },
      { id: "SI.L2-3.14.6", title: "Security Alerts", description: "Monitor organizational systems to detect attacks and indicators of compromise", category: "System Integrity", modules: ["detection_eng", "threat_intel", "threat_hunting"] },
      { id: "SI.L2-3.14.7", title: "Identify Unauthorized Use", description: "Identify unauthorized use of organizational systems", category: "System Integrity", modules: ["detection_eng", "event_log", "threat_hunting"] },
    ],
  },
];

function computePosture(controls: Control[], activeModules: string[]) {
  const activeSet = new Set(activeModules);
  let covered = 0, partial = 0, gap = 0;
  const detail = controls.map(c => {
    const coveredModules = c.modules.filter(m => activeSet.has(m));
    let status: "covered" | "partial" | "gap";
    if (coveredModules.length === c.modules.length) { status = "covered"; covered++; }
    else if (coveredModules.length > 0) { status = "partial"; partial++; }
    else { status = "gap"; gap++; }
    return { ...c, status, coveredModules, missingModules: c.modules.filter(m => !activeSet.has(m)) };
  });
  const score = Math.round(((covered + partial * 0.5) / controls.length) * 100);
  return { score, covered, partial, gap, total: controls.length, controls: detail };
}

router.get("/compliance/frameworks", requireAuth, (_req, res) => {
  res.json(FRAMEWORKS.map(f => ({
    key: f.key, name: f.name, shortName: f.shortName,
    version: f.version, description: f.description,
    totalControls: f.controls.length,
  })));
});

router.get("/compliance/posture", requireAuth, async (req, res) => {
  const session = (req as any).session;
  try {
    const activeModules = await getActiveModules(session.tenantId, session.tenantTier);
    const result = FRAMEWORKS.map(f => {
      const { score, covered, partial, gap, total } = computePosture(f.controls, activeModules);
      return { key: f.key, name: f.name, shortName: f.shortName, score, covered, partial, gap, total };
    });
    res.json({ frameworks: result, activeModules });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/compliance/framework/:key", requireAuth, async (req, res) => {
  const session = (req as any).session;
  const framework = FRAMEWORKS.find(f => f.key === req.params.key);
  if (!framework) { res.status(404).json({ error: "Framework not found" }); return; }
  try {
    const activeModules = await getActiveModules(session.tenantId, session.tenantTier);
    const posture = computePosture(framework.controls, activeModules);
    res.json({ framework: { key: framework.key, name: framework.name, shortName: framework.shortName, version: framework.version, description: framework.description }, posture, activeModules });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/compliance/gaps", requireAuth, async (req, res) => {
  const session = (req as any).session;
  try {
    const activeModules = await getActiveModules(session.tenantId, session.tenantTier);
    const activeSet = new Set(activeModules);

    const MODULE_LABELS: Record<string, string> = {
      command_center: "Command Center", agent_fleet: "Agent Fleet", sprint_ops: "Sprint Ops",
      missions: "Missions", threat_intel: "Threat Intel", detection_eng: "Detection Eng.",
      incidents: "Incidents", event_log: "Event Log", adversarial_sim: "Adversarial Sim",
      threat_hunting: "Threat Hunting", ai_copilot: "AI Copilot", compliance: "Compliance",
      behavioral_analytics: "Behavioral Analytics", playbooks: "Playbooks",
      executive: "Executive Dashboard", early_warning: "Early Warning",
    };

    const moduleCoverageGap: Record<string, { module: string; label: string; controlsCovered: number }> = {};

    for (const framework of FRAMEWORKS) {
      for (const control of framework.controls) {
        const missingModules = control.modules.filter(m => !activeSet.has(m));
        for (const m of missingModules) {
          if (!moduleCoverageGap[m]) moduleCoverageGap[m] = { module: m, label: MODULE_LABELS[m] ?? m, controlsCovered: 0 };
          moduleCoverageGap[m].controlsCovered++;
        }
      }
    }

    const recommendations = Object.values(moduleCoverageGap)
      .sort((a, b) => b.controlsCovered - a.controlsCovered)
      .map(r => ({
        ...r,
        message: `Enabling ${r.label} would cover ${r.controlsCovered} additional control${r.controlsCovered !== 1 ? "s" : ""} across all frameworks`,
      }));

    res.json({ recommendations, activeModules });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
