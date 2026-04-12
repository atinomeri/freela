import { prisma } from "@/lib/prisma";
import { requireDesktopAuth } from "@/lib/desktop-auth";
import { errors, success } from "@/lib/api-response";
import { upsertDesktopSmtpConfigSchema } from "@/lib/validation";
import { encryptSecretValue } from "@/lib/secret-crypto";

function envDefaults() {
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure =
    (process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  return {
    host: process.env.SMTP_HOST || "",
    port,
    secure,
    username: process.env.SMTP_USER || "",
    fromEmail: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    fromName: "",
    trackOpens: process.env.TRACK_OPENS === "true",
    trackClicks: process.env.TRACK_CLICKS === "true",
  };
}

export async function GET(req: Request) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;

    const config = await prisma.desktopSmtpConfig.findUnique({
      where: { desktopUserId: auth.user.id },
      select: {
        id: true,
        host: true,
        port: true,
        secure: true,
        username: true,
        fromEmail: true,
        fromName: true,
        trackOpens: true,
        trackClicks: true,
        updatedAt: true,
      },
    });

    if (!config) {
      return success({
        ...envDefaults(),
        hasPassword: Boolean(process.env.SMTP_PASS),
        source: "env",
      });
    }

    return success({
      ...config,
      hasPassword: true,
      source: "user",
    });
  } catch (err) {
    console.error("[SMTP Config Get] Error:", err);
    return errors.serverError();
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = upsertDesktopSmtpConfigSchema.safeParse(body);
    if (!parsed.success) return errors.validationError(parsed.error.issues);

    const data = parsed.data;

    const existing = await prisma.desktopSmtpConfig.findUnique({
      where: { desktopUserId: auth.user.id },
      select: { id: true, passwordEnc: true },
    });

    const passwordEnc = data.password
      ? encryptSecretValue(data.password)
      : existing?.passwordEnc;

    if (!passwordEnc) {
      return errors.badRequest("SMTP password is required for initial setup");
    }

    const updated = await prisma.desktopSmtpConfig.upsert({
      where: { desktopUserId: auth.user.id },
      create: {
        desktopUserId: auth.user.id,
        host: data.host,
        port: data.port,
        secure: data.secure ?? data.port === 465,
        username: data.username,
        passwordEnc,
        fromEmail: data.fromEmail ?? null,
        fromName: data.fromName ?? null,
        trackOpens: data.trackOpens ?? true,
        trackClicks: data.trackClicks ?? true,
      },
      update: {
        host: data.host,
        port: data.port,
        secure: data.secure ?? data.port === 465,
        username: data.username,
        passwordEnc,
        fromEmail: data.fromEmail ?? null,
        fromName: data.fromName ?? null,
        trackOpens: data.trackOpens ?? true,
        trackClicks: data.trackClicks ?? true,
      },
      select: {
        id: true,
        host: true,
        port: true,
        secure: true,
        username: true,
        fromEmail: true,
        fromName: true,
        trackOpens: true,
        trackClicks: true,
        updatedAt: true,
      },
    });

    return success({ ...updated, hasPassword: true, source: "user" });
  } catch (err) {
    console.error("[SMTP Config Update] Error:", err);
    return errors.serverError();
  }
}

