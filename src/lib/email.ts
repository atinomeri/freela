import "server-only";
import nodemailer from "nodemailer";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

function parseBoolean(value: string | undefined) {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !portRaw || !from) return null;

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) return null;

  const secure = process.env.SMTP_SECURE ? parseBoolean(process.env.SMTP_SECURE) : port === 465;

  const user = process.env.SMTP_USER?.trim() || undefined;
  const pass = process.env.SMTP_PASS?.trim() || undefined;

  return { host, port, secure, user, pass, from };
}

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(config: SmtpConfig) {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined
  });
  return cachedTransporter;
}

export function isEmailConfigured() {
  return Boolean(getSmtpConfig());
}

export async function sendEmail(params: { to: string; subject: string; text: string; html?: string }) {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error("Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_FROM (and optionally SMTP_USER/SMTP_PASS).");
  }

  const transporter = getTransporter(config);
  await transporter.sendMail({
    from: config.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    ...(params.html ? { html: params.html } : {})
  });
}

