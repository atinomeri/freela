import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateFreelancerListingCache } from "@/lib/cache";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

function normalizeSkills(input: unknown) {
  const raw = String(input ?? "");
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  return Array.from(new Set(items)).slice(0, 30);
}

function validateProfile(input: { title: string; bio: string }) {
  if (input.title.trim().length < 2) return "PROFILE_TITLE_MIN";
  if (input.bio.trim().length < 20) return "PROFILE_BIO_MIN";
  if (input.bio.trim().length > 1000) return "PROFILE_BIO_MAX";
  return "";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "FREELANCER") return jsonError("FORBIDDEN", 403);

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, userId: true, title: true, bio: true, skills: true, updatedAt: true }
  });

  return NextResponse.json({ ok: true, profile }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "FREELANCER") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; bio?: unknown; skills?: unknown }
    | null;

  const title = String(body?.title ?? "").trim();
  const bio = String(body?.bio ?? "").trim();
  const skills = normalizeSkills(body?.skills);

  const error = validateProfile({ title, bio });
  if (error) return jsonError(error, 400);

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, title, bio, skills },
    update: { title, bio, skills },
    select: { id: true, userId: true, title: true, bio: true, skills: true, updatedAt: true }
  });

  await invalidateFreelancerListingCache();

  return NextResponse.json({ ok: true, profile }, { status: 200 });
}
