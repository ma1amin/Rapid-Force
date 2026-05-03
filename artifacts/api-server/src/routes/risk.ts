import { Router } from "express";
import { db } from "@workspace/db";
import { incidentsTable, threatsTable, detectionsTable } from "@workspace/db";

const router = Router();

router.get("/risk-score", async (req, res) => {
  try {
    const [incidents, threats, detections] = await Promise.all([
      db.select().from(incidentsTable),
      db.select().from(threatsTable),
      db.select().from(detectionsTable),
    ]);

    const openCritical       = incidents.filter(i => i.severity === "critical" && i.status !== "closed" && i.status !== "eradicated").length;
    const openHigh           = incidents.filter(i => i.severity === "high"     && i.status !== "closed" && i.status !== "eradicated").length;
    const openTotal          = incidents.filter(i => i.status === "open" || i.status === "investigating").length;
    const criticalThreats    = threats.filter(t => t.severity === "critical" && t.status === "active").length;
    const activeThreats      = threats.filter(t => t.status === "active").length;
    const disabledDetections = detections.filter(d => d.status === "disabled").length;
    const activeDetections   = detections.filter(d => d.status === "active").length;
    const totalDetections    = detections.length;
    const detectionCoverage  = totalDetections > 0 ? (activeDetections / totalDetections) * 100 : 0;

    let score = 15;
    score += openCritical    * 15;
    score += openHigh        * 8;
    score += Math.min(openTotal, 10) * 3;
    score += criticalThreats * 10;
    score += Math.min(activeThreats, 20) * 2;
    score += disabledDetections * 3;
    score -= Math.round(detectionCoverage * 0.15);

    const riskScore    = Math.min(100, Math.max(0, Math.round(score)));
    const postureScore = 100 - riskScore;
    const level        = riskScore >= 70 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 30 ? "medium" : "low";

    const breakdown = [
      { factor: "Open Critical Incidents", count: openCritical,    impact: openCritical    * 15 },
      { factor: "Open High Incidents",     count: openHigh,        impact: openHigh        * 8  },
      { factor: "Active Critical Threats", count: criticalThreats, impact: criticalThreats * 10 },
      { factor: "Total Active Threats",    count: activeThreats,   impact: Math.min(activeThreats, 20) * 2 },
      { factor: "Disabled Detections",     count: disabledDetections, impact: disabledDetections * 3 },
    ].filter(b => b.count > 0);

    res.json({
      riskScore,
      postureScore,
      level,
      breakdown,
      stats: {
        openCritical, openHigh, openTotal,
        activeThreats, criticalThreats,
        activeDetections, totalDetections,
        detectionCoverage: Math.round(detectionCoverage),
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
