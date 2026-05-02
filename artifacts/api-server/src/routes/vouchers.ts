import { Router } from "express";
import { db, vouchersTable, voucherRedemptionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin";

const router = Router();

const CreateVoucherSchema = z.object({
  code: z.string().min(3).max(32).toUpperCase(),
  description: z.string().max(200).optional(),
  discountType: z.enum(["percent", "flat"]),
  discountValue: z.number().int().min(1).max(10000),
  tierRestriction: z.enum(["trial", "starter", "professional", "enterprise"]).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

const PatchVoucherSchema = z.object({
  description: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

router.get("/admin/vouchers", requirePlatformAdmin, async (req, res) => {
  try {
    const vouchers = await db.select().from(vouchersTable).orderBy(desc(vouchersTable.createdAt));
    res.json(vouchers);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/vouchers", requirePlatformAdmin, async (req, res) => {
  const parsed = CreateVoucherSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  try {
    const existing = await db.select().from(vouchersTable).where(eq(vouchersTable.code, parsed.data.code));
    if (existing.length > 0) { res.status(409).json({ error: "Voucher code already exists" }); return; }
    const [voucher] = await db.insert(vouchersTable).values({
      code: parsed.data.code,
      description: parsed.data.description ?? null,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      tierRestriction: parsed.data.tierRestriction ?? null,
      maxUses: parsed.data.maxUses ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    }).returning();
    res.status(201).json(voucher);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/admin/vouchers/:id", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = PatchVoucherSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  try {
    const updates: any = {};
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
    if (parsed.data.maxUses !== undefined) updates.maxUses = parsed.data.maxUses;
    if (parsed.data.expiresAt !== undefined) updates.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
    const [updated] = await db.update(vouchersTable).set(updates).where(eq(vouchersTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/admin/vouchers/:id", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(voucherRedemptionsTable).where(eq(voucherRedemptionsTable.voucherId, id));
    await db.delete(vouchersTable).where(eq(vouchersTable.id, id));
    res.json({ ok: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/admin/vouchers/:id/redemptions", requirePlatformAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const redemptions = await db.select().from(voucherRedemptionsTable)
      .where(eq(voucherRedemptionsTable.voucherId, id))
      .orderBy(desc(voucherRedemptionsTable.redeemedAt));
    res.json(redemptions);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

// Public — validate a voucher code (used on registration form)
router.post("/vouchers/validate", async (req, res) => {
  const { code, tier } = req.body ?? {};
  if (!code) { res.status(400).json({ error: "Code required" }); return; }
  try {
    const [voucher] = await db.select().from(vouchersTable).where(eq(vouchersTable.code, String(code).toUpperCase()));
    if (!voucher) { res.status(404).json({ error: "Invalid voucher code" }); return; }
    if (!voucher.isActive) { res.status(400).json({ error: "Voucher is no longer active" }); return; }
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      res.status(400).json({ error: "Voucher has expired" }); return;
    }
    if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
      res.status(400).json({ error: "Voucher has reached its usage limit" }); return;
    }
    if (voucher.tierRestriction && tier && voucher.tierRestriction !== tier) {
      res.status(400).json({ error: `Voucher only valid for ${voucher.tierRestriction} tier` }); return;
    }
    res.json({
      valid: true,
      code: voucher.code,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      tierRestriction: voucher.tierRestriction,
    });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
