type Sender = (event: string, data: unknown) => void;

// Per-instance SSE connection registry (NOT shared across instances).
const connections = new Map<string, Set<Sender>>();

export function addConnection(userId: string, send: Sender) {
  const existing = connections.get(userId) ?? new Set<Sender>();
  existing.add(send);
  connections.set(userId, existing);

  return () => {
    const set = connections.get(userId);
    if (!set) return;
    set.delete(send);
    if (set.size === 0) connections.delete(userId);
  };
}

export function fanoutToUser(userId: string, event: string, data: unknown) {
  const set = connections.get(userId);
  if (!set) return;
  for (const send of Array.from(set)) {
    try {
      send(event, data);
    } catch {
      set.delete(send);
    }
  }
  if (set.size === 0) connections.delete(userId);
}

