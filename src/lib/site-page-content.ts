import "server-only";

import { prisma } from "@/lib/prisma";

export async function getPageOverride(path: string, locale: string) {
  const page = await prisma.sitePage.findUnique({
    where: { path },
    select: {
      contents: {
        where: { locale },
        take: 1,
        select: { title: true, body: true }
      }
    }
  });

  const content = page?.contents[0];
  if (!content) return null;

  const title = content.title.trim();
  const body = content.body.trim();
  if (!title && !body) return null;

  return { title, body };
}

