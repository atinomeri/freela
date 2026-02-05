import { createClient, type RedisClientType } from "redis";

type Handler = (payload: any) => void;

let publisher: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;

const channelHandlers = new Map<string, Set<Handler>>();
const channelSubscribed = new Set<string>();

function requireRedisUrl() {
  const url = process.env.REDIS_URL;
  if (!url || url.trim().length === 0) {
    throw new Error("Missing REDIS_URL. Add REDIS_URL=\"redis://localhost:6379\" to .env.local.");
  }
  return url;
}

async function getPublisher() {
  if (publisher) return publisher;
  publisher = createClient({ url: requireRedisUrl() });
  publisher.on("error", () => {
    // keep process alive; redis client will reconnect
  });
  await publisher.connect();
  return publisher;
}

async function getSubscriber() {
  if (subscriber) return subscriber;
  subscriber = createClient({ url: requireRedisUrl() });
  subscriber.on("error", () => {
    // keep process alive; redis client will reconnect
  });
  await subscriber.connect();
  return subscriber;
}

export async function publish(channel: string, payload: unknown) {
  const client = await getPublisher();
  await client.publish(channel, JSON.stringify(payload));
}

export async function subscribe(channel: string, handler: Handler) {
  const handlers = channelHandlers.get(channel) ?? new Set<Handler>();
  handlers.add(handler);
  channelHandlers.set(channel, handlers);

  const client = await getSubscriber();
  if (!channelSubscribed.has(channel)) {
    channelSubscribed.add(channel);
    await client.subscribe(channel, (message) => {
      let payload: any = null;
      try {
        payload = JSON.parse(message);
      } catch {
        return;
      }
      const set = channelHandlers.get(channel);
      if (!set) return;
      for (const h of set) h(payload);
    });
  }

  return async () => {
    const set = channelHandlers.get(channel);
    if (!set) return;
    set.delete(handler);
    if (set.size > 0) return;

    channelHandlers.delete(channel);
    if (subscriber && channelSubscribed.has(channel)) {
      channelSubscribed.delete(channel);
      try {
        await subscriber.unsubscribe(channel);
      } catch {
        // ignore
      }
    }
  };
}

