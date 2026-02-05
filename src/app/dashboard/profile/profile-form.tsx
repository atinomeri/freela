"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslations } from "next-intl";

type Props = {
  initial: {
    title: string;
    bio: string;
    skills: string;
    hourlyGEL: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const t = useTranslations("dashboardProfileForm");
  const tApiErrors = useTranslations("apiErrors");
  const [title, setTitle] = useState(initial.title);
  const [bio, setBio] = useState(initial.bio);
  const [skills, setSkills] = useState(initial.skills);
  const [hourlyGEL, setHourlyGEL] = useState(initial.hourlyGEL);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  const validate = () => {
    if (title.trim().length < 2) return t("errors.titleMin");
    if (bio.trim().length < 20) return t("errors.bioMin");
    if (bio.trim().length > 1000) return t("errors.bioMax");
    if (hourlyGEL.trim() !== "" && !/^\d+$/.test(hourlyGEL.trim())) return t("errors.rateNumeric");
    return "";
  };

  return (
    <Card className="mt-6 p-6">
      {error ? <div className="mb-4 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm">{error}</div> : null}
      {success ? (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">{success}</div>
      ) : null}

      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const err = validate();
          if (err) {
            setError(err);
            setSuccess("");
            return;
          }
          setError("");
          setPending(true);
          try {
            const res = await fetch("/api/profile", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                title,
                bio,
                skills,
                hourlyGEL
              })
            });
            const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string } | null;
            if (!res.ok || !json?.ok) {
              setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.saveFailed"));
              setSuccess("");
              return;
            }
            setSuccess(t("saved"));
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="grid gap-1 text-sm">
          {t("title")}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("titlePlaceholder")}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          {t("bio")}
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-40 rounded-lg border border-border bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("bioPlaceholder")}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          {t("skills")}
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("skillsPlaceholder")}
          />
        </label>

        <label className="grid gap-1 text-sm">
          {t("rate")}
          <input
            value={hourlyGEL}
            onChange={(e) => setHourlyGEL(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("ratePlaceholder")}
            inputMode="numeric"
          />
        </label>

        <Button type="submit" className="mt-2" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>
    </Card>
  );
}
