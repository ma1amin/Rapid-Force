import { Router } from "express";
import { db } from "@workspace/db";
import { moduleLicensesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/requireAuth";
import { z } from "zod/v4";

const router = Router();

router.get("/licenses", requireAuth, async (req, res) => {
  const session = (req as any).session;
  try {
    const licenses = await db
      .select()
      .from(moduleLicensesTable)
      .where(eq(moduleLicensesTable.tenantId, session.tenantId));
    res.json(licenses.map(l => ({ moduleKey: l.moduleKey, enabled: l.enabled })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PatchBody = z.object({ enabled: z.boolean() });

router.patch("/licenses/:moduleKey", requireAuth, async (req, res) => {
  const session = (req as any).session;
  if (session.userRole !== "admin") {
    res.status(403).json({ error: "Admin role required" });
    return;
  }
  const parsed = PatchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { moduleKey } = req.params;
  try {
    const [existing] = await db
      .select()
      .from(moduleLicensesTable)
      .where(
        and(
          eq(moduleLicensesTable.tenantId, session.tenantId),
          eq(moduleLicensesTable.moduleKey, moduleKey)
        )
      );

    if (existing) {
      await db
        .update(moduleLicensesTable)
        .set({ enabled: parsed.data.enabled, updatedAt: new Date() })
        .where(
          and(
            eq(moduleLicensesTable.tenantId, session.tenantId),
            eq(moduleLicensesTable.moduleKey, moduleKey)
          )
        );
    } else {
      await db.insert(moduleLicensesTable).values({
        tenantId: session.tenantId,
        moduleKey,
        enabled: parsed.data.enabled,
      });
    }

    res.json({ ok: true, moduleKey, enabled: parsed.data.enabled });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
