import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addConnection, fanoutToUser } from "@/lib/realtime";
import { subscribe } from "@/lib/realtime-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Envelope = {
  type?: unknown;
  toUserIds?: unknown;
  data?: unknown;
};

function asEnvelope(payload: unknown): Envelope {
  return payload && typeof payload === "object" ? (payload as Envelope) : {};
}

let subscribed = false;

async function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  await subscribe("events", (payload: unknown) => {
    const envelope = asEnvelope(payload);
    const type = String(envelope.type ?? "");
    const toUserIds = Array.isArray(envelope.toUserIds) ? envelope.toUserIds.map(String) : [];
    const data = envelope.data;
    if (!type || toUserIds.length === 0) return;
    for (const userId of toUserIds) {
      fanoutToUser(userId, type, data);
    }
  });
}

// Monotonically increasing event ID per process (for Last-Event-ID resumption)
let eventIdCounter = 0;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  // Parse Last-Event-ID for reconnection (informational — we can't replay missed events
  // without a durable store, but the client knows it reconnected)
  const lastEventId = req.headers.get("Last-Event-ID");

  await ensureSubscribed();

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        const id = String(++eventIdCounter);
        try {
          controller.enqueue(encoder.encode(`id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream closed
        }
      };

      send("connected", { ok: true, reconnected: !!lastEventId, lastEventId });
      const unsubscribe = addConnection(userId, send);

      // Heartbeat every 20s to keep connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 20_000);

      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
    },
    cancel() {
      cleanup?.();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    }
  });
}
