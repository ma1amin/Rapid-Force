import { Router } from "express";
import { db } from "@workspace/db";
import { sprintsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateSprintBody,
  UpdateSprintBody,
  GetSprintParams,
  UpdateSprintParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/sprints", async (req, res) => {
  try {
    const sprints = await db.select().from(sprintsTable).orderBy(sprintsTable.createdAt);
    res.json(sprints.map((s) => ({ ...s, progress: Number(s.progress) })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/sprints", async (req, res) => {
  const parsed = CreateSprintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [sprint] = await db
      .insert(sprintsTable)
      .values({ ...parsed.data })
      .returning();

    await db.insert(activityTable).values({
      type: "sprint_planning",
      message: `${sprint.name} initialized — scope: ${sprint.objective}`,
      agentName: "PM-1",
      entityType: "sprint",
      entityId: sprint.id,
    });

    res.status(201).json({ ...sprint, progress: Number(sprint.progress) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sprints/:id", async (req, res) => {
  const parsed = GetSprintParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [sprint] = await db
      .select()
      .from(sprintsTable)
      .where(eq(sprintsTable.id, parsed.data.id));
    if (!sprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }
    res.json({ ...sprint, progress: Number(sprint.progress) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/sprints/:id", async (req, res) => {
  const paramsParsed = UpdateSprintParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateSprintBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.flatten() });
    return;
  }
  try {
    const updates: Record<string, unknown> = {};
    if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;
    if (bodyParsed.data.progress !== undefined) updates.progress = String(bodyParsed.data.progress);

    const [sprint] = await db
      .update(sprintsTable)
      .set(updates)
      .where(eq(sprintsTable.id, paramsParsed.data.id))
      .returning();
    if (!sprint) {
      res.status(404).json({ error: "Sprint not found" });
      return;
    }

    if (bodyParsed.data.status !== undefined) {
      const eventType =
        sprint.status === "active" ? "sprint_started" :
        sprint.status === "complete" ? "sprint_complete" : "sprint_planning";
      await db.insert(activityTable).values({
        type: eventType,
        message: `${sprint.name} status changed to ${sprint.status.toUpperCase()}`,
        agentName: "CTO-1",
        entityType: "sprint",
        entityId: sprint.id,
      });
    }

    res.json({ ...sprint, progress: Number(sprint.progress) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
