/**
 * Auth Service — registration business logic
 *
 * Extracted from the register API route so the HTTP handler stays thin.
 * All validation, rate-limiting, user creation & email-verification live here.
 */
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { EmployerType, Role } from "@prisma/client";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { validatePasswordStrength } from "@/lib/password-strength";
import { isFreelancerCategory, type FreelancerCategory } from "@/lib/categories";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { verifyEmailTemplate } from "@/lib/email-templates/verify-email";
import { reportError } from "@/lib/logger";
import { badRequest, conflict, rateLimited, ServiceError, internal } from "./errors";

// ─── Constants ──────────────────────────────────────────────

const VERIFY_TOKEN_TTL_HOURS = 24;
const isDev = process.env.NODE_ENV !== "production";
const isE2E = process.env.E2E === "true";

// ─── Types ──────────────────────────────────────────────────

export type RegisterPayload =
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

export type RegisterInput = {
  raw: Record<string, unknown>;
  ip: string;
  locale?: string;
};

export type RegisterResult = {
  user: { id: string; email: string; role: string };
  messageCode: string;
  debugVerifyUrl?: string;
};

// ─── Helpers ────────────────────────────────────────────────

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
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

function baseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

// ─── Validation & parsing ───────────────────────────────────

export function parseAndValidate(raw: Record<string, unknown>): RegisterPayload {
  const roleInput = String(raw.role ?? "").trim().toLowerCase();
  const email = String(raw.email ?? "").trim().toLowerCase();
  const password = String(raw.password ?? "");
  const phoneRaw = normalizePhone(String(raw.phone ?? ""));

  if (roleInput !== "employer" && roleInput !== "freelancer") throw badRequest("ROLE_INVALID");
  if (!email || !email.includes("@")) throw badRequest("EMAIL_INVALID");
  if (!phoneRaw) throw badRequest("PHONE_REQUIRED");
  if (!phoneRaw.startsWith("+")) throw badRequest("PHONE_INVALID");

  const parsedPhone = parsePhoneNumberFromString(phoneRaw);
  if (!parsedPhone?.isValid()) throw badRequest("PHONE_INVALID");
  const phone = parsedPhone.number;

  const phoneDigits = digitsOnly(phone);
  if (phoneDigits.length < 9 || phoneDigits.length > 15) throw badRequest("PHONE_INVALID");

  // Password strength
  const passwordStrength = validatePasswordStrength(password);
  if (!passwordStrength.isAcceptable) {
    throw new ServiceError("PASSWORD_WEAK", 400, {
      feedback: passwordStrength.feedback,
      suggestions: passwordStrength.suggestions,
      score: passwordStrength.score,
    });
  }

  const confirmPassword = typeof raw.confirmPassword === "string" ? String(raw.confirmPassword) : "";
  if (!confirmPassword) throw badRequest("CONFIRM_REQUIRED");
  if (password !== confirmPassword) throw badRequest("PASSWORDS_MISMATCH");

  // Build discriminated payload
  let payload: RegisterPayload;

  if (roleInput === "freelancer") {
    const categoryRaw = typeof raw.category === "string" ? raw.category.trim() : "";
    if (!categoryRaw) throw badRequest("CATEGORY_REQUIRED");
    if (!isFreelancerCategory(categoryRaw)) throw badRequest("CATEGORY_INVALID");

    payload = {
      role: "freelancer",
      category: categoryRaw,
      name: String(raw.name ?? "").trim(),
      personalId: digitsOnly(String(raw.personalId ?? "")),
      birthDate: String(raw.birthDate ?? "").trim(),
      phone,
      email,
      password,
    };
  } else {
    const employerTypeInput = String(raw.employerType ?? "").trim().toLowerCase();
    if (employerTypeInput !== "individual" && employerTypeInput !== "company") {
      throw badRequest("EMPLOYER_TYPE_INVALID");
    }

    if (employerTypeInput === "company") {
      payload = {
        role: "employer",
        employerType: "company",
        companyName: String(raw.companyName ?? "").trim(),
        companyId: digitsOnly(String(raw.companyId ?? "")),
        phone,
        email,
        password,
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
        password,
      };
    }
  }

  // Role-specific field validation
  if (payload.role === "freelancer" || payload.employerType === "individual") {
    if (payload.name.length < 2) throw badRequest("NAME_REQUIRED");
    if (payload.personalId.length !== 11) throw badRequest("PERSONAL_ID_LENGTH");
    if (!parseBirthDate(payload.birthDate)) throw badRequest("BIRTHDATE_INVALID");
    payload.birthDate = payload.birthDate.trim();
  } else {
    if (payload.companyName.length < 2) throw badRequest("COMPANY_NAME_REQUIRED");
    if (payload.companyId.length !== 9) throw badRequest("COMPANY_ID_LENGTH");
  }

  return payload;
}

// ─── Rate-limit check ───────────────────────────────────────

export async function enforceRateLimits(ip: string, email: string): Promise<void> {
  const ipLimit = await checkRateLimit({ scope: "register:ip", key: ip, limit: 20, windowSeconds: 15 * 60 });
  if (!ipLimit.allowed) throw rateLimited();
  const emailLimit = await checkRateLimit({ scope: "register:email", key: email, limit: 5, windowSeconds: 60 * 60 });
  if (!emailLimit.allowed) throw rateLimited();
}

// ─── Core registration ─────────────────────────────────────

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const { raw, ip, locale = "ka" } = input;

  // 1. Parse and validate
  const payload = parseAndValidate(raw);

  // 2. Rate limiting
  await enforceRateLimits(ip, payload.email);

  // 3. Prerequisite checks
  if (!("emailVerificationToken" in prisma)) {
    throw internal("SERVER_RESTART_REQUIRED");
  }

  if (process.env.NODE_ENV === "production" && !isEmailConfigured()) {
    throw internal("EMAIL_SERVICE_UNAVAILABLE");
  }

  // 4. Check existing user
  const existing = await prisma.user.findUnique({ where: { email: payload.email }, select: { id: true } });
  if (existing) {
    if (isDev) console.info(`[register] 409 email exists email=${payload.email}`);
    throw conflict("USER_EXISTS");
  }

  // 5. Derive Prisma-friendly values
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

  // 6. Create user
  const passwordHash = await bcrypt.hash(payload.password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email: payload.email,
      role,
      passwordHash,
      emailVerifiedAt: isE2E ? new Date() : null,
      phone: payload.phone,
      personalId,
      birthDate,
      employerType,
      companyName,
      companyId,
      profile: { create: payload.role === "freelancer" ? { category: payload.category } : {} },
    },
    select: { id: true, email: true, role: true },
  });

  // 7. E2E: skip email verification
  if (isE2E) {
    return { user, messageCode: "EMAIL_VERIFICATION_SENT" };
  }

  // 8. Email verification token
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_HOURS * 60 * 60_000);

  await prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const verifyUrl = `${baseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const { subject, text, html } = verifyEmailTemplate({ verifyUrl, ttlHours: VERIFY_TOKEN_TTL_HOURS, locale });

  // 9. Send verification email
  if (isEmailConfigured()) {
    try {
      await sendEmail({ to: payload.email, subject, text, html });
    } catch (e) {
      reportError("[register] failed to send verification email", e, { email: payload.email });
      if (process.env.NODE_ENV === "production") {
        try {
          await prisma.user.delete({ where: { id: user.id } });
        } catch (cleanupErr) {
          reportError("[register] cleanup after email send failure failed", cleanupErr, { userId: user.id, email: payload.email });
        }
        throw internal("REQUEST_FAILED");
      }
      console.info(`[register] ${payload.email} -> ${verifyUrl}`);
      return { user, messageCode: "EMAIL_VERIFICATION_SENT", debugVerifyUrl: verifyUrl };
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.info(`[register] ${payload.email} -> ${verifyUrl}`);
    return { user, messageCode: "EMAIL_VERIFICATION_SENT", debugVerifyUrl: verifyUrl };
  }

  if (isDev) console.info(`[register] 201 created id=${user.id} email=${user.email} role=${user.role}`);
  return { user, messageCode: "EMAIL_VERIFICATION_SENT" };
}
