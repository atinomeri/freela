import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

function validateProfile(input: { title: string; bio: string; hourlyGEL?: number | null }) {
  if (input.title.trim().length < 2) return "PROFILE_TITLE_MIN";
  if (input.bio.trim().length < 20) return "PROFILE_BIO_MIN";
  if (input.bio.trim().length > 1000) return "PROFILE_BIO_MAX";
  if (input.hourlyGEL != null && input.hourlyGEL < 0) return "PROFILE_RATE_INVALID";
  return "";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "FREELANCER") return jsonError("FORBIDDEN", 403);

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, userId: true, title: true, bio: true, hourlyGEL: true, skills: true, updatedAt: true }
  });

  return NextResponse.json({ ok: true, profile }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("UNAUTHORIZED", 401);
  if (session.user.role !== "FREELANCER") return jsonError("FORBIDDEN", 403);

  const body = (await req.json().catch(() => null)) as
    | { title?: unknown; bio?: unknown; skills?: unknown; hourlyGEL?: unknown }
    | null;

  const title = String(body?.title ?? "").trim();
  const bio = String(body?.bio ?? "").trim();
  const skills = normalizeSkills(body?.skills);

  let hourlyGEL: number | null = null;
  if (body?.hourlyGEL !== undefined && body?.hourlyGEL !== null && String(body?.hourlyGEL).trim() !== "") {
    const parsed = Number.parseInt(String(body?.hourlyGEL), 10);
    if (!Number.isFinite(parsed)) {
      return jsonError("PROFILE_RATE_INVALID", 400);
    }
    hourlyGEL = parsed;
  }

  const error = validateProfile({ title, bio, hourlyGEL });
  if (error) return jsonError(error, 400);

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, title, bio, skills, hourlyGEL },
    update: { title, bio, skills, hourlyGEL },
    select: { id: true, userId: true, title: true, bio: true, skills: true, hourlyGEL: true, updatedAt: true }
  });

  return NextResponse.json({ ok: true, profile }, { status: 200 });
}
