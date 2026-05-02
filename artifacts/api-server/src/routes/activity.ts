import { Router } from "express";
import { db } from "@workspace/db";
import { activityTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { ListActivityQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/activity", async (req, res) => {
  try {
    const queryParsed = ListActivityQueryParams.safeParse(req.query);
    const limit = queryParsed.success && queryParsed.data.limit ? queryParsed.data.limit : 20;

    const events = await db
      .select()
      .from(activityTable)
      .orderBy(desc(activityTable.createdAt))
      .limit(limit);
    res.json(events);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
