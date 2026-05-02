import { Router } from "express";
import { db } from "@workspace/db";
import { detectionsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/detections", async (req, res) => {
  try {
    const detections = await db.select().from(detectionsTable).orderBy(detectionsTable.createdAt);
    res.json(detections);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/detections/summary", async (req, res) => {
  try {
    const detections = await db.select().from(detectionsTable);
    const summary = {
      total: detections.length,
      active: detections.filter(d => d.status === "active").length,
      testing: detections.filter(d => d.status === "testing").length,
      disabled: detections.filter(d => d.status === "disabled").length,
      review: detections.filter(d => d.status === "review").length,
      sigma: detections.filter(d => d.type === "sigma").length,
      yara: detections.filter(d => d.type === "yara").length,
      ioc: detections.filter(d => d.type === "ioc").length,
      behavioral: detections.filter(d => d.type === "behavioral").length,
      critical: detections.filter(d => d.severity === "critical").length,
      high: detections.filter(d => d.severity === "high").length,
    };
    res.json(summary);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/detections", async (req, res) => {
  const { name, description, type, ruleContent, severity, mitreTechnique, mitreTactic, tags, author } = req.body;
  if (!name || !description || !type || !ruleContent || !severity) {
    res.status(400).json({ error: "name, description, type, ruleContent, severity required" });
    return;
  }
  try {
    const [detection] = await db
      .insert(detectionsTable)
      .values({ name, description, type, ruleContent, severity, mitreTechnique, mitreTactic, tags, author })
      .returning();

    await db.insert(activityTable).values({
      type: "detection_created",
      message: `[${detection.type.toUpperCase()}] New detection rule deployed: ${detection.name}`,
      agentName: "ENG-1",
      entityType: "detection",
      entityId: detection.id,
    });

    res.status(201).json(detection);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/detections/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, ruleContent, severity } = req.body;
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (ruleContent) updates.ruleContent = ruleContent;
    if (severity) updates.severity = severity;

    const [detection] = await db
      .update(detectionsTable)
      .set(updates)
      .where(eq(detectionsTable.id, id))
      .returning();
    if (!detection) { res.status(404).json({ error: "Detection not found" }); return; }

    await db.insert(activityTable).values({
      type: "detection_updated",
      message: `Detection "${detection.name}" status → ${detection.status.toUpperCase()}`,
      agentName: "ENG-1",
      entityType: "detection",
      entityId: detection.id,
    });

    res.json(detection);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
