# Curated Intelligence Stack

## SOC • Red Team • Blue Team • Threat Intelligence • Threat Hunting • Incident Response

------------------------------------------------------------------------

# Purpose

A unified operational intelligence ecosystem integrating SOC operations,
adversary simulation, threat intelligence, hunting, and incident
response --- optimized for integration with any AI platform (Claude,
ChatGPT, local LLMs, agents, copilots, or RAG systems).

------------------------------------------------------------------------

# 1. Core Framework Layer

## MITRE ATT&CK

URL: https://attack.mitre.org\
Description: The global standard knowledge base of adversary tactics,
techniques, and procedures (TTPs). Used for detection engineering,
threat hunting, red teaming, and SOC maturity assessments.

Implementation: - Map alerts to ATT&CK IDs. - Measure detection
coverage. - Build ATT&CK heatmaps.

------------------------------------------------------------------------

## MITRE D3FEND

URL: https://d3fend.mitre.org\
Description: Defensive countermeasure framework aligned with ATT&CK
techniques to validate defensive effectiveness.

Implementation: - Map controls → defensive techniques. - Identify
missing protections.

------------------------------------------------------------------------

## NIST Incident Response Framework

URL:
https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf\
Description: Industry-standard incident response lifecycle covering
preparation, detection, containment, eradication, recovery, and lessons
learned.

------------------------------------------------------------------------

## CIS Critical Security Controls

URL: https://www.cisecurity.org/controls\
Description: Practical prioritized security controls used to
operationalize security programs.

------------------------------------------------------------------------

# 2. SOC & Detection Engineering Stack

## SigmaHQ (Detection Rules)

URL: https://github.com/SigmaHQ/sigma\
Description: Open-source generic detection rule format convertible to
Splunk, Elastic, Sentinel, QRadar, and others.

Implementation: - Store rules in Git. - Convert to SIEM queries. -
Continuous validation.

------------------------------------------------------------------------

## SOC Prime Detection Marketplace

URL: https://socprime.com\
Description: Community-driven detection engineering platform offering
curated threat detection content.

------------------------------------------------------------------------

## Elastic Security Labs

URL: https://www.elastic.co/security-labs\
Description: Advanced threat research and detection engineering
examples.

------------------------------------------------------------------------

## The DFIR Report

URL: https://thedfirreport.com\
Description: Real-world intrusion analysis showing attacker timelines
and detection opportunities.

------------------------------------------------------------------------

## Detection Engineering Resources (GitHub)

-   https://github.com/0x4D31/awesome-threat-detection
-   https://github.com/jsecurity101/DetectThis

Description: Curated repositories of detection methodologies and
research.

------------------------------------------------------------------------

# 3. Red Team & Adversary Simulation

## Atomic Red Team

URL: https://github.com/redcanaryco/atomic-red-team\
Description: Small executable tests mapped to ATT&CK techniques used to
validate detection capability.

------------------------------------------------------------------------

## MITRE Caldera

URL: https://github.com/mitre/caldera\
Description: Automated adversary emulation framework for continuous
validation.

------------------------------------------------------------------------

## Infection Monkey

URL: https://github.com/guardicore/monkey\
Description: Breach and attack simulation platform testing lateral
movement risks.

------------------------------------------------------------------------

## SpecterOps Research

URL: https://specterops.io/resources\
Description: Advanced adversary tradecraft research, especially Active
Directory attacks.

------------------------------------------------------------------------

## PayloadsAllTheThings

URL: https://github.com/swisskyrepo/PayloadsAllTheThings\
Description: Comprehensive offensive security payload repository.

------------------------------------------------------------------------

## HackTricks

URL: https://github.com/carlospolop/hacktricks\
Description: Practical penetration testing encyclopedia.

------------------------------------------------------------------------

# 4. Threat Intelligence (CTI) Stack

## Mandiant Threat Intelligence

URL: https://www.mandiant.com/resources\
Description: High-confidence reporting on advanced persistent threats
and intrusion trends.

------------------------------------------------------------------------

## Recorded Future

URL: https://www.recordedfuture.com\
Description: Intelligence platform aggregating global threat signals.

------------------------------------------------------------------------

## VirusTotal

URL: https://www.virustotal.com\
Description: Malware intelligence, file analysis, and IOC pivoting
platform.

------------------------------------------------------------------------

## AlienVault OTX

URL: https://otx.alienvault.com\
Description: Open threat intelligence sharing community.

------------------------------------------------------------------------

## OpenCTI

URL: https://github.com/OpenCTI-Platform/opencti\
Description: Open-source threat intelligence management platform.

------------------------------------------------------------------------

## MISP

URL: https://github.com/MISP/MISP\
Description: Open-source threat intelligence sharing and correlation
platform.

------------------------------------------------------------------------

## IntelOwl

URL: https://github.com/intelowlproject/IntelOwl\
Description: Automated threat intelligence enrichment engine.

------------------------------------------------------------------------

# 5. Threat Hunting Operations

## ThreatHunter Playbook

URL: https://threathunterplaybook.com\
Description: Structured hunting methodologies and investigation
procedures.

------------------------------------------------------------------------

## Microsoft Security Research

URL: https://www.microsoft.com/security/blog\
Description: Hunting queries, detection insights, and telemetry-driven
investigations.

------------------------------------------------------------------------

## Awesome Threat Hunting (GitHub)

URL: https://github.com/0x4D31/awesome-threat-hunting\
Description: Curated collection of threat hunting resources and
techniques.

------------------------------------------------------------------------

# 6. Incident Response Playbooks

## CISA Playbooks

URL:
https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks\
Description: Government-grade incident response workflows and ransomware
guidance.

------------------------------------------------------------------------

## Google Cloud Security Incident Response

URL: https://cloud.google.com/security/incident-response\
Description: Cloud-native incident handling methodologies.

------------------------------------------------------------------------

## PagerDuty Incident Response Guides

URL: https://www.pagerduty.com/resources/learn/incident-management\
Description: Incident coordination and response orchestration.

------------------------------------------------------------------------

# 7. SOC Tooling & Automation (Open Source)

## Wazuh

URL: https://github.com/wazuh/wazuh\
Description: Open-source SIEM/XDR platform.

------------------------------------------------------------------------

## Security Onion

URL: https://github.com/Security-Onion-Solutions/securityonion\
Description: Complete SOC-in-a-box monitoring platform.

------------------------------------------------------------------------

## Velociraptor

URL: https://github.com/Velocidex/velociraptor\
Description: Endpoint visibility and DFIR hunting tool.

------------------------------------------------------------------------

## GRR Rapid Response

URL: https://github.com/google/grr\
Description: Remote live forensics framework.

------------------------------------------------------------------------

## Shuffle SOAR

URL: https://github.com/frikky/Shuffle\
Description: Open-source security orchestration and automation.

------------------------------------------------------------------------

# 8. AI Integration Architecture

Implementation Steps:

1.  Store all markdown files in Git repository.
2.  Index repository using vector database.
3.  Connect AI using Retrieval Augmented Generation (RAG).
4.  Enforce ATT&CK tagging across outputs.
5.  Automate detection + hunting generation.

Example AI Prompts: - Generate Sigma rules from threat report. - Build
hunting queries from ATT&CK technique. - Produce incident timeline. -
Create adversary simulation plan.

------------------------------------------------------------------------

# 9. Recommended Folder Structure

/intelligence /frameworks /detections /playbooks /threat-intel /hunts
/red-team /automation /ai-prompts

------------------------------------------------------------------------

# 10. Deployment Models

Small Team: - Single AI agent - Git repo intelligence library

Enterprise SOC: - RAG-enabled AI - Automated detection pipelines

Cyber Fusion Center: - Multi-agent AI ecosystem - Continuous adversary
validation

------------------------------------------------------------------------

# End State

Intelligence → Detection → Hunting → Response → Learning → Automation

A continuously improving cyber defense ecosystem.

------------------------------------------------------------------------
