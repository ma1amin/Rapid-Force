import { Router } from "express";
import { db } from "@workspace/db";
import { threatsTable } from "@workspace/db";
import { activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateThreatBody,
  ListThreatsQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/threats/summary", async (req, res) => {
  try {
    const threats = await db.select().from(threatsTable);
    const summary = {
      total: threats.length,
      critical: threats.filter((t) => t.severity === "critical").length,
      high: threats.filter((t) => t.severity === "high").length,
      medium: threats.filter((t) => t.severity === "medium").length,
      low: threats.filter((t) => t.severity === "low").length,
      mitigated: threats.filter((t) => t.status === "mitigated").length,
      active: threats.filter((t) => t.status === "active").length,
    };
    res.json(summary);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/threats", async (req, res) => {
  try {
    const queryParsed = ListThreatsQueryParams.safeParse(req.query);
    let threats;
    if (queryParsed.success && queryParsed.data.severity) {
      threats = await db
        .select()
        .from(threatsTable)
        .where(eq(threatsTable.severity, queryParsed.data.severity))
        .orderBy(threatsTable.detectedAt);
    } else {
      threats = await db.select().from(threatsTable).orderBy(threatsTable.detectedAt);
    }
    res.json(threats);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/threats", async (req, res) => {
  const parsed = CreateThreatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const [threat] = await db
      .insert(threatsTable)
      .values({ ...parsed.data })
      .returning();

    await db.insert(activityTable).values({
      type: "threat_detected",
      message: `[${threat.severity.toUpperCase()}] Threat detected: ${threat.title}`,
      agentName: "Red Team",
      entityType: "threat",
      entityId: threat.id,
    });

    res.status(201).json(threat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
