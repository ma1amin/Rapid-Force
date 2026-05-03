import ReactCodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { javascript } from "@codemirror/lang-javascript";
import { dracula } from "@uiw/codemirror-theme-dracula";

function getExtensions(type: string) {
  switch (type) {
    case "sigma":
    case "query":
      return [yaml()];
    case "yara":
    case "ioc":
    case "behavioral":
      return [javascript({ jsx: false })];
    default:
      return [];
  }
}

const TEMPLATES: Record<string, string> = {
  sigma: `title: Detect Suspicious PowerShell Execution
status: experimental
description: Detects suspicious PowerShell command execution with encoded commands
author: SOC-Analyst
date: ${new Date().toISOString().split("T")[0]}
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    CommandLine|contains:
      - '-EncodedCommand'
      - '-enc '
      - 'bypass'
      - 'hidden'
  condition: selection
falsepositives:
  - Administrative scripts
level: high
tags:
  - attack.execution
  - attack.t1059.001`,

  yara: `rule Suspicious_PowerShell_Encoded {
  meta:
    description = "Detects PowerShell with encoded commands"
    author = "SOC-Analyst"
    date = "${new Date().toISOString().split("T")[0]}"
    severity = "high"
  strings:
    $enc1 = "-EncodedCommand" nocase
    $enc2 = "-enc " nocase
    $bypass = "bypass" nocase
    $hidden = "hidden" nocase
  condition:
    any of them
}`,

  ioc: `# IOC List — Threat Hunt
# Format: type:value | description
# Types: ip, domain, hash, url, email

ip:185.220.101.0/24    | TOR Exit Node Range
ip:45.142.212.100      | C2 Server — Cobalt Strike
domain:malware-c2[.]ru | Active C2 Domain
hash:e3b0c44298fc1c149a | Ransomware dropper SHA256
url:http://bad[.]actor/payload.exe | Payload delivery URL`,

  query: `# KQL / SIEM Query
# Detect lateral movement via PsExec

SecurityEvent
| where EventID in (4624, 4625, 4648)
| where LogonType == 3
| where ProcessName endswith "PSEXESVC.exe"
  or ParentProcessName endswith "psexec.exe"
| extend Account = strcat(SubjectDomainName, "\\\\", SubjectUserName)
| where Account !endswith "$"
| summarize Count=count(), Targets=make_set(Computer) by Account
| where Count > 5
| order by Count desc`,

  behavioral: `# Behavioral Rule — Anomaly Detection
# Trigger: User accessing files outside normal pattern

rule {
  name: "Unusual File Access Volume"
  description: "User accessed >3x their daily average files"
  
  baseline_window: 30d
  threshold_multiplier: 3.0
  
  attributes:
    - entity_type: user
    - metric: files_accessed_per_day
    - comparison: greater_than_baseline * threshold
  
  severity: high
  auto_escalate: true
  notify: ["soc-team", "manager"]
}`,
};

interface RuleEditorProps {
  value: string;
  onChange: (value: string) => void;
  type: string;
  onInsertTemplate?: () => void;
}

export default function RuleEditor({ value, onChange, type, onInsertTemplate }: RuleEditorProps) {
  const template = TEMPLATES[type] ?? TEMPLATES.sigma;

  return (
    <div className="border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0e14] border-b border-border">
        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">
          {type.toUpperCase()} RULE EDITOR
          {type === "sigma" || type === "query" ? " · YAML" : type === "yara" ? " · YARA" : ""}
        </span>
        <button
          type="button"
          onClick={() => { onChange(template); onInsertTemplate?.(); }}
          className="text-[10px] font-mono text-primary/70 hover:text-primary transition-colors px-2 py-0.5 border border-primary/20 hover:border-primary/50"
        >
          INSERT TEMPLATE
        </button>
      </div>
      <ReactCodeMirror
        value={value}
        onChange={onChange}
        theme={dracula}
        extensions={getExtensions(type)}
        minHeight="160px"
        maxHeight="320px"
        basicSetup={{
          lineNumbers:             true,
          foldGutter:              false,
          dropCursor:              false,
          allowMultipleSelections: false,
          indentOnInput:           true,
          highlightActiveLine:     true,
          syntaxHighlighting:      true,
          bracketMatching:         true,
          closeBrackets:           true,
          autocompletion:          false,
          rectangularSelection:    false,
          crosshairCursor:         false,
          highlightActiveLineGutter: true,
        }}
      />
    </div>
  );
}
