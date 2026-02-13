import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addConnection, fanoutToUser } from "@/lib/realtime";
import { subscribe } from "@/lib/realtime-bus";

export const runtime = "nodejs";

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  await ensureSubscribed();

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send("connected", { ok: true });
      const unsubscribe = addConnection(userId, send);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // ignore
        }
      }, 25000);

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
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
