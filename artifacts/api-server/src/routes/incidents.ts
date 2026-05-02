import { Router } from "express";
import { db } from "@workspace/db";
import { incidentsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/incidents", async (req, res) => {
  try {
    const incidents = await db.select().from(incidentsTable).orderBy(incidentsTable.createdAt);
    res.json(incidents.reverse());
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/incidents/summary", async (req, res) => {
  try {
    const incidents = await db.select().from(incidentsTable);
    const summary = {
      total: incidents.length,
      open: incidents.filter(i => i.status === "open").length,
      investigating: incidents.filter(i => i.status === "investigating").length,
      contained: incidents.filter(i => i.status === "contained").length,
      closed: incidents.filter(i => i.status === "closed").length,
      critical: incidents.filter(i => i.severity === "critical").length,
      high: incidents.filter(i => i.severity === "high").length,
      mttr: null,
    };
    res.json(summary);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/incidents", async (req, res) => {
  const { title, description, severity, type, assignedAgentId, affectedSystems, iocIndicators, attackVector, mitreTechnique } = req.body;
  if (!title || !description || !severity || !type) {
    res.status(400).json({ error: "title, description, severity, type required" });
    return;
  }
  try {
    const [incident] = await db
      .insert(incidentsTable)
      .values({ title, description, severity, type, assignedAgentId, affectedSystems, iocIndicators, attackVector, mitreTechnique })
      .returning();

    await db.insert(activityTable).values({
      type: "incident_opened",
      message: `[${incident.severity.toUpperCase()}] Incident opened: ${incident.title}`,
      agentName: "SEC-1",
      entityType: "incident",
      entityId: incident.id,
    });

    res.status(201).json(incident);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/incidents/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, assignedAgentId, containmentActions, playbookSteps } = req.body;
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) {
      updates.status = status;
      if (status === "closed" || status === "eradicated") updates.resolvedAt = new Date();
    }
    if (assignedAgentId !== undefined) updates.assignedAgentId = assignedAgentId;
    if (containmentActions) updates.containmentActions = containmentActions;
    if (playbookSteps) updates.playbookSteps = playbookSteps;

    const [incident] = await db
      .update(incidentsTable)
      .set(updates)
      .where(eq(incidentsTable.id, id))
      .returning();
    if (!incident) { res.status(404).json({ error: "Incident not found" }); return; }

    const evtType = incident.status === "closed" ? "incident_closed" :
                    incident.status === "contained" ? "incident_contained" : "incident_updated";
    await db.insert(activityTable).values({
      type: evtType,
      message: `Incident "${incident.title}" → ${incident.status.toUpperCase()}`,
      agentName: "SEC-1",
      entityType: "incident",
      entityId: incident.id,
    });

    res.json(incident);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
