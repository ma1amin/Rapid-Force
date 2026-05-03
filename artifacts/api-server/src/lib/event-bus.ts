import type { Response } from "express";
import { randomUUID } from "crypto";

interface SseClient {
  id: string;
  res: Response;
}

const clients = new Map<string, SseClient>();

export function addSseClient(res: Response): string {
  const id = randomUUID();
  clients.set(id, { id, res });
  return id;
}

export function removeSseClient(id: string): void {
  clients.delete(id);
}

export function broadcastEvent(type: string, data: unknown): void {
  const payload = `data: ${JSON.stringify({ type, data, ts: Date.now() })}\n\n`;
  for (const [id, client] of clients) {
    try {
      client.res.write(payload);
    } catch {
      clients.delete(id);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
