import { Router } from "express";
import { db, announcementsTable } from "@workspace/db";
import { eq, desc, and, or, isNull, gte } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin";

const router = Router();

const CreateSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(1000),
  type: z.enum(["info", "warning", "critical"]).default("info"),
  expiresAt: z.string().nullable().optional(),
});

const PatchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  body: z.string().min(1).max(1000).optional(),
  type: z.enum(["info", "warning", "critical"]).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
});

router.get("/admin/announcements", requirePlatformAdmin, async (req, res) => {
  try {
    const items = await db.select().from(announcementsTable).orderBy(desc(announcementsTable.createdAt));
    res.json(items);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/announcements", requirePlatformAdmin, async (req, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  try {
    const [item] = await db.insert(announcementsTable).values({
      title: parsed.data.title,
      body: parsed.data.body,
      type: parsed.data.type,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    }).returning();
    res.status(201).json(item);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/announcements/:id", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = PatchSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  try {
    const updates: any = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.body !== undefined) updates.body = parsed.data.body;
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
    if (parsed.data.expiresAt !== undefined) updates.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    const [updated] = await db.update(announcementsTable).set(updates).where(eq(announcementsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/announcements/:id", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
    res.json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Public — tenant portal fetches this
router.get("/announcements/active", async (req, res) => {
  try {
    const now = new Date();
    const items = await db.select().from(announcementsTable)
      .where(
        and(
          eq(announcementsTable.isActive, true),
          or(isNull(announcementsTable.expiresAt), gte(announcementsTable.expiresAt, now))
        )
      )
      .orderBy(desc(announcementsTable.createdAt))
      .limit(5);
    res.json(items);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
