# Curated Intelligence Stack

## SOC • Red Team • Blue Team • Threat Intelligence • Threat Hunting • Incident Response

------------------------------------------------------------------------

## Purpose

This document provides a complete, operational intelligence ecosystem
combining: - Security Operations Center (SOC) - Red Team & Adversary
Simulation - Blue Team Detection Engineering - Threat Intelligence
(CTI) - Threat Hunting - Incident Response Playbooks

Designed to work with ANY AI tool (Claude, ChatGPT, local LLMs, agents,
copilots).

------------------------------------------------------------------------

# 1. Core Framework Layer

## MITRE ATT&CK

Use as the central knowledge graph. Implementation: 1. Map detections to
ATT&CK techniques. 2. Tag alerts using Technique IDs. 3. Build
dashboards by tactic phase.

AI Usage: - Ask AI: "Generate detections for ATT&CK T1059" - Auto-create
hunting hypotheses.

------------------------------------------------------------------------

## MITRE D3FEND

Defensive mapping against attacker techniques.

Implementation: - Link defensive controls to ATT&CK detections. -
Validate coverage gaps.

AI Prompt: "Map my SIEM detections to D3FEND controls."

------------------------------------------------------------------------

## NIST Incident Response Framework

Use SP 800-61 lifecycle: 1. Preparation 2. Detection 3. Containment 4.
Eradication 5. Recovery 6. Lessons Learned

AI Role: Generate IR playbooks automatically from incidents.

------------------------------------------------------------------------

# 2. SOC & Detection Engineering Stack

## Detection Sources

-   SigmaHQ rules
-   SOC Prime library
-   Elastic Security Labs research

Implementation: - Convert Sigma → SIEM queries. - Version control
detections in Git. - Continuous detection testing.

AI Workflow: - Paste threat report → AI generates Sigma rules. -
Auto-document alerts.

------------------------------------------------------------------------

# 3. Red Team Intelligence Stack

Sources: - SpecterOps research - PayloadsAllTheThings - HackTricks

Implementation: - Emulate adversary techniques weekly. - Run Atomic
simulations. - Validate SOC detections.

AI Workflow: "Generate adversary simulation plan based on latest
ransomware TTPs."

------------------------------------------------------------------------

# 4. Threat Intelligence (CTI) Stack

Core Sources: - Mandiant Reports - Recorded Future - VirusTotal -
AlienVault OTX

Implementation: - Normalize IOCs. - Enrich indicators automatically. -
Build internal intel database.

AI Automation: - Summarize threat reports. - Extract TTPs. - Generate
hunting queries.

------------------------------------------------------------------------

# 5. Threat Hunting Operations

Methodology: 1. Hypothesis driven hunts 2. Telemetry analysis 3. ATT&CK
mapping 4. Detection improvement

Sources: - ThreatHunter Playbook - Microsoft Security Research

AI Workflow: "Create hunt plan for credential theft activity."

------------------------------------------------------------------------

# 6. Incident Response Playbooks

Sources: - CISA playbooks - Google Cloud Security - PagerDuty workflows

Implementation: - Convert playbooks → automation scripts. - Integrate
with SOAR platforms. - Use decision trees.

AI Usage: - Generate containment steps. - Draft executive reports. -
Produce timeline reconstruction.

------------------------------------------------------------------------

# 7. AI Integration Architecture

## Recommended Structure

AI Layer → Knowledge Sources → Automation → SOC Operations

### Step 1 --- Build Knowledge Base

Store: - ATT&CK data - Playbooks - Detection rules - Threat reports

### Step 2 --- Connect AI Tool

Any AI should: - Index markdown repository - Use semantic search -
Enable retrieval augmented generation (RAG)

### Step 3 --- Operational Prompts

Examples: - "Create SOC detection coverage report." - "Convert threat
intel into hunting queries." - "Generate incident response workflow." -
"Simulate adversary behavior."

### Step 4 --- Continuous Loop

Threat Intel → Detection → Hunting → IR → Lessons Learned → Updated
Knowledge

------------------------------------------------------------------------

# 8. Recommended Folder Structure

/intelligence /frameworks /detections /playbooks /threat-intel /hunts
/red-team /automation /ai-prompts

------------------------------------------------------------------------

# 9. AI Operating Instructions

1.  Load this repository at session start.
2.  Assume role: SOC Analyst + Threat Hunter + CTI Analyst.
3.  Use ATT&CK taxonomy always.
4.  Generate structured outputs:
    -   Tables
    -   Detection logic
    -   Playbooks
5.  Continuously improve detections.

------------------------------------------------------------------------

# 10. Deployment Models

## Small Team

-   Single AI assistant
-   Central markdown repo
-   Manual execution

## Enterprise SOC

-   RAG-enabled AI
-   Detection pipeline automation
-   SOAR integration

## Cyber Fusion Center

-   Multi-agent AI
-   Continuous adversary simulation
-   Autonomous threat validation

------------------------------------------------------------------------

# End State

A living intelligence ecosystem where: - Intelligence feeds detection -
Detection drives hunting - Hunting improves response - Response
strengthens resilience

------------------------------------------------------------------------

End of File
