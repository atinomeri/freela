import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isFreelancerCategory, type FreelancerCategory } from "@/lib/categories";
import { EmployerType, Role } from "@prisma/client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const isDev = process.env.NODE_ENV !== "production";

function jsonError(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

function parseBirthDate(value: string) {
  const s = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  const todayYmd = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const birthYmd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (birthYmd > todayYmd) return null;
  if (d.getFullYear() < 1900) return null;
  return d;
}

type Payload =
  | {
      role: "freelancer";
      category: FreelancerCategory;
      name: string;
      personalId: string;
      birthDate: string;
      phone: string;
      email: string;
      password: string;
    }
  | {
      role: "employer";
      employerType: "individual";
      name: string;
      personalId: string;
      birthDate: string;
      phone: string;
      email: string;
      password: string;
    }
  | {
      role: "employer";
      employerType: "company";
      companyName: string;
      companyId: string;
      phone: string;
      email: string;
      password: string;
    };

export async function POST(req: Request) {
  const raw = (await req.json().catch(() => null)) as Partial<Record<string, unknown>> | null;
  if (!raw) return jsonError("INVALID_REQUEST", 400);

  const roleInput = String(raw.role ?? "").trim().toLowerCase();
  const email = String(raw.email ?? "").trim().toLowerCase();
  const password = String(raw.password ?? "");
  const phone = normalizePhone(String(raw.phone ?? ""));

  if (roleInput !== "employer" && roleInput !== "freelancer") return jsonError("ROLE_INVALID", 400);
  if (!email || !email.includes("@")) return jsonError("EMAIL_INVALID", 400);
  if (!phone) return jsonError("PHONE_REQUIRED", 400);

  const ip = getClientIp(req);
  const ipLimit = await checkRateLimit({ scope: "register:ip", key: ip, limit: 20, windowSeconds: 15 * 60 });
  if (!ipLimit.allowed) return jsonError("RATE_LIMITED", 429);
  const emailLimit = await checkRateLimit({ scope: "register:email", key: email, limit: 5, windowSeconds: 60 * 60 });
  if (!emailLimit.allowed) return jsonError("RATE_LIMITED", 429);

  const phoneDigits = digitsOnly(phone);
  if (phoneDigits.length < 9 || phoneDigits.length > 15) return jsonError("PHONE_INVALID", 400);
  if (password.length < 8) return jsonError("PASSWORD_MIN", 400);

  const confirmPassword = typeof raw.confirmPassword === "string" ? String(raw.confirmPassword) : "";
  if (!confirmPassword) return jsonError("CONFIRM_REQUIRED", 400);
  if (password !== confirmPassword) return jsonError("PASSWORDS_MISMATCH", 400);

  let payload: Payload | null = null;

  if (roleInput === "freelancer") {
    const categoryRaw = typeof raw.category === "string" ? raw.category.trim() : "";
    if (!categoryRaw) return jsonError("CATEGORY_REQUIRED", 400);
    if (!isFreelancerCategory(categoryRaw)) return jsonError("CATEGORY_INVALID", 400);

    payload = {
      role: "freelancer",
      category: categoryRaw,
      name: String(raw.name ?? "").trim(),
      personalId: digitsOnly(String(raw.personalId ?? "")),
      birthDate: String(raw.birthDate ?? "").trim(),
      phone,
      email,
      password
    };
  } else {
    const employerTypeInput = String(raw.employerType ?? "").trim().toLowerCase();
    if (employerTypeInput !== "individual" && employerTypeInput !== "company") {
      return jsonError("EMPLOYER_TYPE_INVALID", 400);
    }

    if (employerTypeInput === "company") {
      payload = {
        role: "employer",
        employerType: "company",
        companyName: String(raw.companyName ?? "").trim(),
        companyId: digitsOnly(String(raw.companyId ?? "")),
        phone,
        email,
        password
      };
    } else {
      payload = {
        role: "employer",
        employerType: "individual",
        name: String(raw.name ?? "").trim(),
        personalId: digitsOnly(String(raw.personalId ?? "")),
        birthDate: String(raw.birthDate ?? "").trim(),
        phone,
        email,
        password
      };
    }
  }

  if (payload.role === "freelancer" || payload.employerType === "individual") {
    if (payload.name.length < 2) return jsonError("NAME_REQUIRED", 400);
    if (payload.personalId.length !== 11) return jsonError("PERSONAL_ID_LENGTH", 400);
    const birthDate = parseBirthDate(payload.birthDate);
    if (!birthDate) return jsonError("BIRTHDATE_INVALID", 400);
    payload.birthDate = payload.birthDate.trim();
  } else {
    if (payload.companyName.length < 2) return jsonError("COMPANY_NAME_REQUIRED", 400);
    if (payload.companyId.length !== 9) return jsonError("COMPANY_ID_LENGTH", 400);
  }

  const role = payload.role === "freelancer" ? Role.FREELANCER : Role.EMPLOYER;
  const employerType =
    payload.role === "employer"
      ? payload.employerType === "company"
        ? EmployerType.COMPANY
        : EmployerType.INDIVIDUAL
      : null;

  const name =
    payload.role === "employer" && payload.employerType === "company" ? payload.companyName : payload.name;

  const personalId =
    payload.role === "freelancer" || payload.employerType === "individual" ? payload.personalId : null;
  const birthDate =
    payload.role === "freelancer" || payload.employerType === "individual"
      ? parseBirthDate(payload.birthDate)
      : null;
  const companyName = payload.role === "employer" && payload.employerType === "company" ? payload.companyName : null;
  const companyId = payload.role === "employer" && payload.employerType === "company" ? payload.companyId : null;

  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      if (isDev) console.info(`[register] 409 email exists email=${email}`);
      return jsonError("USER_EXISTS", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passwordHash,
        phone,
        personalId,
        birthDate,
        employerType,
        companyName,
        companyId,
        profile: { create: payload.role === "freelancer" ? { category: payload.category } : {} }
      },
      select: { id: true, email: true, role: true }
    });

    if (isDev) console.info(`[register] 201 created id=${user.id} email=${user.email} role=${user.role}`);
    return NextResponse.json({ ok: true, user }, { status: 200 });
  } catch (err: any) {
    const message = String(err?.message ?? "");
    if (message.includes("Unique constraint") || message.includes("unique")) {
      if (isDev) console.info("[register] 409 unique constraint", { message });
      return jsonError("DUPLICATE_ID", 409);
    }
    if (isDev) console.error("[register] error", err);
    return jsonError("REGISTER_FAILED", 500);
  }
}
