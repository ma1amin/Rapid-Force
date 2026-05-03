import { Router } from "express";
import { db } from "@workspace/db";
import { incidentsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { broadcastEvent } from "../lib/event-bus";

const VALID_ACTIONS = ["isolate", "block_ip", "quarantine", "snapshot", "notify"] as const;
type ActionType = typeof VALID_ACTIONS[number];

function buildActionLog(action: ActionType, incident: typeof incidentsTable.$inferSelect): string {
  const ts = new Date().toISOString();
  const ref = `INC-${incident.id}-${Date.now().toString(36).toUpperCase()}`;
  const systems = incident.affectedSystems || "affected systems";

  switch (action) {
    case "isolate":
      return `[${ts}] HOST ISOLATION — ${systems} removed from production network. Quarantine VLAN applied. EDR containment rule: ${ref}. Network access revoked pending investigation.`;
    case "block_ip":
      return `[${ts}] IP BLOCK — Malicious indicator(s) added to firewall blocklist across all edge nodes. Drop rule ${ref} applied. Threat intel feed updated.`;
    case "quarantine":
      return `[${ts}] FILE QUARANTINE — Malicious file/process quarantined by EDR. SHA256 hash submitted to threat intel platform. Sandbox detonation queued. Evidence ID: ${ref}.`;
    case "snapshot":
      return `[${ts}] FORENSIC SNAPSHOT — Memory dump and disk image captured from ${systems}. Chain of custody established. Evidence container: ${ref}. Retention: 90 days.`;
    case "notify":
      return `[${ts}] STAKEHOLDER NOTIFICATION — SOC team, incident owner, and management notified via secure channel. On-call roster escalation initiated. Reference: ${ref}.`;
  }
}

const router = Router();

router.post("/incidents/:id/actions", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const { action } = req.body;
  if (!action || !VALID_ACTIONS.includes(action as ActionType)) {
    res.status(400).json({ error: `Invalid action. Valid: ${VALID_ACTIONS.join(", ")}` });
    return;
  }

  try {
    const [incident] = await db.select().from(incidentsTable).where(eq(incidentsTable.id, id));
    if (!incident) { res.status(404).json({ error: "Incident not found" }); return; }

    const actionLog = buildActionLog(action as ActionType, incident);
    const existing  = incident.containmentActions ?? "";
    const updated   = existing ? `${existing}\n${actionLog}` : actionLog;

    const [updatedIncident] = await db
      .update(incidentsTable)
      .set({ containmentActions: updated, updatedAt: new Date() })
      .where(eq(incidentsTable.id, id))
      .returning();

    await db.insert(activityTable).values({
      type:       "incident_action",
      message:    `Response action "${action.replace(/_/g, " ").toUpperCase()}" executed on incident "${incident.title}"`,
      agentName:  "AUTO-RESPONSE",
      entityType: "incident",
      entityId:   id,
    });

    broadcastEvent("incident_action", {
      incidentId: id,
      title:      incident.title,
      severity:   incident.severity,
      action,
      log:        actionLog,
    });

    res.json({ success: true, action, log: actionLog, incident: updatedIncident });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
