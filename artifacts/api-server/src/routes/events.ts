import { Router } from "express";
import { addSseClient, removeSseClient, clientCount } from "../lib/event-bus";

const router = Router();

router.get("/events/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected", clients: clientCount() + 1, ts: Date.now() })}\n\n`);

  const clientId = addSseClient(res);
  req.log.info({ clientId, total: clientCount() }, "SSE client connected");

  const keepAlive = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeSseClient(clientId);
    req.log.info({ clientId, remaining: clientCount() }, "SSE client disconnected");
  });
});

export default router;
