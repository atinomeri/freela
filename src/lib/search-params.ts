export type SearchParams = Record<string, string | string[] | undefined>;

export function getString(sp: SearchParams, key: string): string {
  const value = sp[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function getStrings(sp: SearchParams, key: string): string[] {
  const value = sp[key];
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

export function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function norm(text: string) {
  return text.trim().toLowerCase();
}

