import "server-only";

type TranslationValues = Record<string, string | number | Date>;

function applyTemplate(input: string, values?: TranslationValues) {
  if (!values || typeof values !== "object") return input;
  return input.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = values[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

export function withOverrides(
  baseT: (key: string, values?: TranslationValues) => string,
  overrides: Record<string, string>,
  prefix: string
) {
  return (key: string, values?: TranslationValues) => {
    const fullKey = `${prefix}${key}`;
    const o = overrides[fullKey];
    if (typeof o === "string") return applyTemplate(o, values);
    return baseT(key, values);
  };
}
