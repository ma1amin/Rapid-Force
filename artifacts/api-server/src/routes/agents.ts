import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateAgentBody,
  UpdateAgentBody,
  GetAgentParams,
  UpdateAgentParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/agents/summary", async (req, res) => {
  try {
    const agents = await db.select().from(agentsTable);
    const summary = {
      total: agents.length,
      active: agents.filter((a) => a.status === "active").length,
      idle: agents.filter((a) => a.status === "idle").length,
      standby: agents.filter((a) => a.status === "standby").length,
      offline: agents.filter((a) => a.status === "offline").length,
      totalMissionsCompleted: agents.reduce((sum, a) => sum + a.missionsCompleted, 0),
    };
    res.json(summary);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agents", async (req, res) => {
  try {
    const agents = await db.select().from(agentsTable).orderBy(agentsTable.createdAt);
    res.json(agents);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/agents", async (req, res) => {
  const parsed = CreateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [agent] = await db
      .insert(agentsTable)
      .values({ ...parsed.data, lastHeartbeat: new Date() })
      .returning();
    res.status(201).json(agent);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agents/:id", async (req, res) => {
  const parsed = GetAgentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, parsed.data.id));
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(agent);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/agents/:id", async (req, res) => {
  const paramsParsed = UpdateAgentParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateAgentBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.flatten() });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;
    if (bodyParsed.data.tasksActive !== undefined) updates.tasksActive = bodyParsed.data.tasksActive;
    updates.lastHeartbeat = new Date();

    const [agent] = await db
      .update(agentsTable)
      .set(updates)
      .where(eq(agentsTable.id, paramsParsed.data.id))
      .returning();
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(agent);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
