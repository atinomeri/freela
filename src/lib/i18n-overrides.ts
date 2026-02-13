import "server-only";

function applyTemplate(input: string, values?: Record<string, unknown>) {
  if (!values || typeof values !== "object") return input;
  return input.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = values[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

export function withOverrides(
  baseT: (key: string, values?: Record<string, unknown>) => string,
  overrides: Record<string, string>,
  prefix: string
) {
  return (key: string, values?: Record<string, unknown>) => {
    const fullKey = `${prefix}${key}`;
    const o = overrides[fullKey];
    if (typeof o === "string") return applyTemplate(o, values);
    return baseT(key, values);
  };
}
