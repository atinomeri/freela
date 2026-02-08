import "server-only";

import { prisma } from "@/lib/prisma";

export async function getSiteContentMap(params: { prefix: string; locale: string }) {
  const prefix = params.prefix.trim();
  const locale = params.locale.trim().toLowerCase();

  const rows = await prisma.siteContent.findMany({
    where: { locale, key: { startsWith: prefix } },
    select: { key: true, value: true }
  });

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

export async function getSiteContentValues(params: { keys: string[]; locale: string }) {
  const locale = params.locale.trim().toLowerCase();
  const keys = params.keys.map((k) => k.trim()).filter((k) => k.length > 0);
  if (keys.length === 0) return {};

  const rows = await prisma.siteContent.findMany({
    where: { locale, key: { in: keys } },
    select: { key: true, value: true }
  });

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}
