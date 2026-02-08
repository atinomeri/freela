"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FREELANCER_CATEGORIES, isFreelancerCategory } from "@/lib/categories";

type Role = "employer" | "freelancer";
type EmployerType = "individual" | "company";

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function isValidDateYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const todayYmd = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const birthYmd = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return birthYmd <= todayYmd && d.getFullYear() >= 1900;
}

function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}

function Segmented({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string; hint?: string }>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              "rounded-xl border px-4 py-3 text-left transition-colors",
              active ? "border-primary/40 bg-primary/5" : "border-border bg-background/60 hover:bg-muted/40"
            ].join(" ")}
          >
            <div className="text-sm font-medium">{o.label}</div>
            {o.hint ? <div className="mt-1 text-xs text-muted-foreground">{o.hint}</div> : null}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      <span className="min-h-4 text-xs">
        {error ? <span className="text-destructive">{error}</span> : null}
        {!error && hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

export function RegisterForm() {
  const t = useTranslations("authRegisterForm");
  const tApiErrors = useTranslations("apiErrors");
  const tApiMessages = useTranslations("apiMessages");
  const tCategories = useTranslations("categories");
  const router = useRouter();

  const [role, setRole] = useState<Role>("employer");
  const [employerType, setEmployerType] = useState<EmployerType>("individual");
  const [category, setCategory] = useState("");

  const [name, setName] = useState("");
  const [personalId, setPersonalId] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");

  const birthDate = useMemo(() => {
    if (!birthYear || !birthMonth || !birthDay) return "";
    const y = Number.parseInt(birthYear, 10);
    const m = Number.parseInt(birthMonth, 10);
    const d = Number.parseInt(birthDay, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
    if (y < 1900 || m < 1 || m > 12) return "";
    const max = daysInMonth(y, m);
    if (d < 1 || d > max) return "";
    return `${birthYear}-${birthMonth}-${birthDay}`;
  }, [birthDay, birthMonth, birthYear]);

  useEffect(() => {
    if (!birthYear || !birthMonth || !birthDay) return;
    const y = Number.parseInt(birthYear, 10);
    const m = Number.parseInt(birthMonth, 10);
    const d = Number.parseInt(birthDay, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return;
    const max = daysInMonth(y, m);
    if (d > max) setBirthDay(String(max).padStart(2, "0"));
  }, [birthDay, birthMonth, birthYear]);

  const [companyName, setCompanyName] = useState("");
  const [companyId, setCompanyId] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [pending, setPending] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [error, setError] = useState("");
  const [okMessage, setOkMessage] = useState("");
  const [debugVerifyUrl, setDebugVerifyUrl] = useState<string | null>(null);

  const isEmployerCompany = role === "employer" && employerType === "company";
  const isIndividualFlow = role === "freelancer" || (role === "employer" && employerType === "individual");

  const birthMonths = [
    { value: "01", label: t("months.01") },
    { value: "02", label: t("months.02") },
    { value: "03", label: t("months.03") },
    { value: "04", label: t("months.04") },
    { value: "05", label: t("months.05") },
    { value: "06", label: t("months.06") },
    { value: "07", label: t("months.07") },
    { value: "08", label: t("months.08") },
    { value: "09", label: t("months.09") },
    { value: "10", label: t("months.10") },
    { value: "11", label: t("months.11") },
    { value: "12", label: t("months.12") }
  ] as const;

  const errors = useMemo(() => {
    const e: Record<string, string> = {};

    const emailNorm = email.trim().toLowerCase();
    const phoneNorm = normalizePhone(phone);

    if (!emailNorm.includes("@")) e.email = t("errors.emailInvalid");
    if (digitsOnly(phoneNorm).length < 9) e.phone = t("errors.phoneInvalid");
    if (password.length < 8) e.password = t("errors.passwordMin");
    if (confirmPassword.trim().length === 0) e.confirmPassword = t("errors.confirmRequired");
    if (confirmPassword && password !== confirmPassword) e.confirmPassword = t("errors.passwordsMismatch");

    if (role === "freelancer" && !isFreelancerCategory(category)) e.category = t("errors.categoryRequired");

    if (isEmployerCompany) {
      if (companyName.trim().length < 2) e.companyName = t("errors.companyNameRequired");
      if (digitsOnly(companyId).length !== 9) e.companyId = t("errors.companyIdLength");
    } else {
      if (name.trim().length < 2) e.name = t("errors.nameRequired");
      if (digitsOnly(personalId).length !== 11) e.personalId = t("errors.personalIdLength");
      if (!isValidDateYmd(birthDate.trim())) e.birthDate = t("errors.birthDateInvalid");
    }

    return e;
  }, [birthDate, category, companyId, companyName, confirmPassword, email, isEmployerCompany, name, password, personalId, phone, role, t]);

  const canSubmit = Object.keys(errors).length === 0;

  return (
    <Card className="mt-6 p-6 sm:p-7">
      {error ? <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">{error}</div> : null}
      {okMessage ? (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{okMessage}</div>
      ) : null}
      {debugVerifyUrl ? (
        <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs">
          {t("devLink")}{" "}
          <a className="underline break-all" href={debugVerifyUrl}>
            {debugVerifyUrl}
          </a>
        </div>
      ) : null}

      <form
        className="grid gap-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitAttempted(true);
          if (!canSubmit) return;
          setPending(true);
          setError("");
          setOkMessage("");
          setDebugVerifyUrl(null);
          try {
            const payload: Record<string, unknown> = {
              role,
              email: email.trim().toLowerCase(),
              phone: normalizePhone(phone),
              password,
              confirmPassword
            };

            if (role === "employer") payload.employerType = employerType;
            if (role === "freelancer") payload.category = category;

            if (isEmployerCompany) {
              payload.companyName = companyName.trim();
              payload.companyId = digitsOnly(companyId);
            } else {
              payload.name = name.trim();
              payload.personalId = digitsOnly(personalId);
              payload.birthDate = birthDate.trim();
            }

            const res = await fetch("/api/register", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload)
            });
            const json = (await res.json().catch(() => null)) as
              | { ok?: boolean; error?: string; errorCode?: string; messageCode?: string; debugVerifyUrl?: string }
              | null;
            if (!res.ok || !json?.ok) {
              setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.submitFailed"));
              return;
            }

            setOkMessage(json.messageCode ? tApiMessages(json.messageCode) : t("successCheckEmail"));
            if (json.debugVerifyUrl) setDebugVerifyUrl(json.debugVerifyUrl);
            // Email verification is required before logging in.
            // Keep the user here so they can follow instructions.
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="grid gap-3">
          <div className="text-sm font-semibold">{t("sections.accountType")}</div>
          <Segmented
            value={role}
            onChange={(v) => setRole(v as Role)}
            options={[
              { value: "employer", label: t("roles.employer.label"), hint: t("roles.employer.hint") },
              { value: "freelancer", label: t("roles.freelancer.label"), hint: t("roles.freelancer.hint") }
            ]}
          />
        </div>

        {role === "employer" ? (
          <div className="grid gap-3">
            <div className="text-sm font-semibold">{t("sections.employerType")}</div>
            <Segmented
              value={employerType}
              onChange={(v) => setEmployerType(v as EmployerType)}
              options={[
                { value: "individual", label: t("employerTypes.individual") },
                { value: "company", label: t("employerTypes.company") }
              ]}
            />
          </div>
        ) : null}

        {isEmployerCompany ? (
          <div className="grid gap-4">
            <div className="text-sm font-semibold">{t("sections.companyInfo")}</div>
            <Field
              label={t("fields.companyName.label")}
              error={submitAttempted ? errors.companyName : undefined}
              hint={t("fields.companyName.hint")}
            >
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("fields.companyName.placeholder")}
                required
              />
            </Field>
            <Field
              label={t("fields.companyId.label")}
              error={submitAttempted ? errors.companyId : undefined}
              hint={t("fields.companyId.hint")}
            >
              <Input
                value={companyId}
                onChange={(e) => setCompanyId(digitsOnly(e.target.value))}
                inputMode="numeric"
                placeholder={t("fields.companyId.placeholder")}
                required
              />
            </Field>
          </div>
        ) : null}

        {isIndividualFlow ? (
          <div className="grid gap-4">
            <div className="text-sm font-semibold">
              {role === "freelancer" ? t("sections.freelancerInfo") : t("sections.individualInfo")}
            </div>
            {role === "freelancer" ? (
              <Field label={t("fields.category.label")} error={submitAttempted ? errors.category : undefined}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                  required
                >
                  <option value="">{t("fields.category.placeholder")}</option>
                  {FREELANCER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {tCategories(c.value)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label={t("fields.name.label")} error={submitAttempted ? errors.name : undefined}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("fields.name.placeholder")}
                required
              />
            </Field>

            <div className="grid gap-4">
              <Field
                label={t("fields.personalId.label")}
                error={submitAttempted ? errors.personalId : undefined}
                hint={t("fields.personalId.hint")}
              >
                <Input
                  value={personalId}
                  onChange={(e) => setPersonalId(digitsOnly(e.target.value))}
                  inputMode="numeric"
                  placeholder={t("fields.personalId.placeholder")}
                  required
                />
              </Field>
              <Field
                label={t("fields.birthDate.label")}
                error={submitAttempted ? errors.birthDate : undefined}
                hint={t("fields.birthDate.hint")}
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  <select
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                    required
                  >
                    <option value="">{t("fields.birthDate.year")}</option>
                    {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => {
                      const y = String(new Date().getFullYear() - i);
                      return (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      );
                    })}
                  </select>

                  <select
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    className="relative z-10 h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                    required
                  >
                    <option value="">{t("fields.birthDate.month")}</option>
                    {birthMonths.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
                    required
                  >
                    <option value="">{t("fields.birthDate.day")}</option>
                    {(() => {
                      const y = Number.parseInt(birthYear, 10);
                      const m = Number.parseInt(birthMonth, 10);
                      const max =
                        Number.isFinite(y) && Number.isFinite(m) && y >= 1900 && m >= 1 && m <= 12 ? daysInMonth(y, m) : 31;
                      return Array.from({ length: max }, (_, i) => {
                        const d = String(i + 1).padStart(2, "0");
                        return (
                          <option key={d} value={d}>
                            {i + 1}
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>
              </Field>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("fields.phone.label")} error={submitAttempted ? errors.phone : undefined} hint={t("fields.phone.hint")}>
              <Input
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value))}
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("fields.phone.placeholder")}
                required
              />
            </Field>
            <Field label={t("fields.email.label")} error={submitAttempted ? errors.email : undefined}>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@company.com"
                required
              />
            </Field>
          </div>

          <Field
            label={t("fields.password.label")}
            error={submitAttempted ? errors.password : undefined}
            hint={t("fields.password.hint")}
          >
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
          </Field>

          <Field label={t("fields.confirmPassword.label")} error={submitAttempted ? errors.confirmPassword : undefined}>
            <Input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
          </Field>
        </div>

        <div className="grid gap-3">
          <Button type="submit" className="h-11" disabled={pending || !canSubmit}>
            {pending ? t("buttons.submitting") : t("buttons.submit")}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline hover:text-foreground"
            onClick={() => router.push("/auth/login")}
          >
            {t("buttons.haveAccount")} {t("buttons.login")}
          </button>
        </div>
      </form>
    </Card>
  );
}
