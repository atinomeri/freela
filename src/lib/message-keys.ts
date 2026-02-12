import "server-only";

function collectKeys(obj: unknown, prefix: string, out: string[]) {
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) collectKeys(obj[i], `${prefix}${i}.`, out);
      return;
    }
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      collectKeys(v, `${prefix}${k}.`, out);
    }
    return;
  }
  // primitive leaf
  out.push(prefix.slice(0, -1));
}

export function getNamespaceKeysFromMessages(messages: any, namespace: string) {
  const root = messages?.[namespace];
  const out: string[] = [];
  collectKeys(root, "", out);
  return out.sort();
}

function getByPath(obj: unknown, path: string) {
  const parts = path.split(".").filter((p) => p.length > 0);
  let cur: any = obj;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = cur[part as keyof typeof cur];
  }
  return cur;
}

export function getMessageValuesByKeys(messages: any, keys: string[]) {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = getByPath(messages, key);
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      out[key] = value;
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    }
  }
  return out;
}
