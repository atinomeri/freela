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

