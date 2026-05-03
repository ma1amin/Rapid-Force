import { Router } from "express";
import { db } from "@workspace/db";
import { incidentsTable, threatsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function matchReasons(
  candidate: typeof incidentsTable.$inferSelect,
  ref:       typeof incidentsTable.$inferSelect,
): string[] {
  const reasons: string[] = [];

  if (ref.mitreTechnique && candidate.mitreTechnique) {
    const t1 = ref.mitreTechnique.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
    const t2 = candidate.mitreTechnique.split(/[,\s]+/).map(t => t.trim()).filter(Boolean);
    const shared = t1.filter(t => t2.includes(t));
    if (shared.length) reasons.push(`MITRE: ${shared.join(", ")}`);
  }

  if (ref.type === candidate.type) {
    reasons.push(`Same type: ${ref.type.replace(/_/g, " ")}`);
  }

  if (ref.iocIndicators && candidate.iocIndicators) {
    const terms = ref.iocIndicators.toLowerCase().split(/[,\s]+/).filter(t => t.length > 5);
    const ioc2  = (candidate.iocIndicators ?? "").toLowerCase();
    if (terms.some(t => ioc2.includes(t))) reasons.push("Shared IOC indicators");
  }

  if (ref.attackVector && candidate.attackVector) {
    const words = ref.attackVector.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const av2   = (candidate.attackVector ?? "").toLowerCase();
    if (words.some(w => av2.includes(w))) reasons.push("Similar attack vector");
  }

  return reasons;
}

router.get("/incidents/:id/correlations", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const allIncidents = await db.select().from(incidentsTable);
    const incident     = allIncidents.find(i => i.id === id);
    if (!incident) { res.status(404).json({ error: "Incident not found" }); return; }

    const allThreats = await db.select().from(threatsTable);

    const relatedIncidents = allIncidents
      .filter(i => i.id !== id)
      .map(i => ({ i, reasons: matchReasons(i, incident) }))
      .filter(({ reasons }) => reasons.length > 0)
      .slice(0, 5)
      .map(({ i, reasons }) => ({
        id: i.id, title: i.title, severity: i.severity,
        status: i.status, type: i.type,
        matchReasons: reasons, createdAt: i.createdAt,
      }));

    const relatedThreats = allThreats
      .filter(t => {
        const typeMatch = (t.type ?? "").toLowerCase().includes(incident.type.split("_")[0] ?? "")
          || incident.type.includes((t.type ?? "").toLowerCase());
        const sevMatch  = t.severity === incident.severity;
        return typeMatch || sevMatch;
      })
      .slice(0, 4)
      .map(t => ({
        id: t.id, name: t.name, severity: t.severity,
        status: t.status, type: t.type, source: t.source,
      }));

    res.json({
      incident: {
        id: incident.id, title: incident.title,
        type: incident.type, mitreTechnique: incident.mitreTechnique,
      },
      relatedIncidents,
      relatedThreats,
      totalCorrelations: relatedIncidents.length + relatedThreats.length,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
