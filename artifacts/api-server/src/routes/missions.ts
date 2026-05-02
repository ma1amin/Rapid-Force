import { Router } from "express";
import { db } from "@workspace/db";
import { missionsTable } from "@workspace/db";
import { activityTable } from "@workspace/db";
import { agentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateMissionBody,
  UpdateMissionBody,
  UpdateMissionParams,
  ListMissionsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/missions", async (req, res) => {
  try {
    const queryParsed = ListMissionsQueryParams.safeParse(req.query);
    const conditions = [];
    if (queryParsed.success) {
      if (queryParsed.data.status) {
        conditions.push(eq(missionsTable.status, queryParsed.data.status));
      }
      if (queryParsed.data.sprintId) {
        conditions.push(eq(missionsTable.sprintId, queryParsed.data.sprintId));
      }
    }
    const missions =
      conditions.length > 0
        ? await db
            .select()
            .from(missionsTable)
            .where(and(...conditions))
            .orderBy(missionsTable.createdAt)
        : await db.select().from(missionsTable).orderBy(missionsTable.createdAt);
    res.json(missions);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/missions", async (req, res) => {
  const parsed = CreateMissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [mission] = await db
      .insert(missionsTable)
      .values({ ...parsed.data, updatedAt: new Date() })
      .returning();

    let agentName: string | null = null;
    if (mission.assignedAgentId) {
      const [agent] = await db
        .select()
        .from(agentsTable)
        .where(eq(agentsTable.id, mission.assignedAgentId));
      agentName = agent?.name ?? null;
    }

    await db.insert(activityTable).values({
      type: "mission_created",
      message: `Mission created: ${mission.title}`,
      agentName,
      entityType: "mission",
      entityId: mission.id,
    });

    res.status(201).json(mission);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/missions/:id", async (req, res) => {
  const paramsParsed = UpdateMissionParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateMissionBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.flatten() });
    return;
  }
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;
    if (bodyParsed.data.assignedAgentId !== undefined)
      updates.assignedAgentId = bodyParsed.data.assignedAgentId;

    const [mission] = await db
      .update(missionsTable)
      .set(updates)
      .where(eq(missionsTable.id, paramsParsed.data.id))
      .returning();
    if (!mission) {
      res.status(404).json({ error: "Mission not found" });
      return;
    }

    let agentName: string | null = null;
    if (mission.assignedAgentId) {
      const [agent] = await db
        .select()
        .from(agentsTable)
        .where(eq(agentsTable.id, mission.assignedAgentId));
      agentName = agent?.name ?? null;
    }

    await db.insert(activityTable).values({
      type: "mission_updated",
      message: `Mission ${mission.title} updated to status: ${mission.status}`,
      agentName,
      entityType: "mission",
      entityId: mission.id,
    });

    res.json(mission);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
