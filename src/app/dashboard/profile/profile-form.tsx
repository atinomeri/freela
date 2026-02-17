"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";

type Props = {
  initial: {
    title: string;
    bio: string;
    skills: string;
    hourlyGEL: string;
    avatarUrl: string;
  };
};

export function ProfileForm({ initial }: Props) {
  const t = useTranslations("dashboardProfileForm");
  const tApiErrors = useTranslations("apiErrors");
  const [title, setTitle] = useState(initial.title);
  const [bio, setBio] = useState(initial.bio);
  const [skills, setSkills] = useState(initial.skills);
  const [hourlyGEL, setHourlyGEL] = useState(initial.hourlyGEL);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const validate = () => {
    if (title.trim().length < 2) return t("errors.titleMin");
    if (bio.trim().length < 20) return t("errors.bioMin");
    if (bio.trim().length > 1000) return t("errors.bioMax");
    if (hourlyGEL.trim() !== "" && !/^\d+$/.test(hourlyGEL.trim())) return t("errors.rateNumeric");
    return "";
  };

  return (
    <Card className="mt-6 rounded-2xl border-border/70 bg-background/70 p-6 shadow-sm backdrop-blur-sm">
      {error ? <div className="mb-4 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm">{error}</div> : null}
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
            if (avatarFile) {
              const formData = new FormData();
              formData.append("avatar", avatarFile);
              const avatarRes = await fetch("/api/profile/avatar", {
                method: "POST",
                body: formData
              });
              const avatarJson = (await avatarRes.json().catch(() => null)) as
                | { ok?: boolean; error?: string; errorCode?: string; avatarUrl?: string }
                | null;
              if (!avatarRes.ok || !avatarJson?.ok || !avatarJson.avatarUrl) {
                setError(avatarJson?.errorCode ? tApiErrors(avatarJson.errorCode) : avatarJson?.error || t("errors.saveFailed"));
                setSuccess("");
                return;
              }
              setAvatarUrl(avatarJson.avatarUrl);
              setAvatarFile(null);
              if (avatarPreview) {
                URL.revokeObjectURL(avatarPreview);
                setAvatarPreview("");
              }
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }

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
          {t("avatar")}
          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/70 p-3">
            <Avatar src={avatarPreview || avatarUrl || undefined} name={title || undefined} size="xl" />
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setError("");
                  setSuccess("");
                  if (!file) {
                    setAvatarFile(null);
                    if (avatarPreview) {
                      URL.revokeObjectURL(avatarPreview);
                      setAvatarPreview("");
                    }
                    return;
                  }
                  const nextPreview = URL.createObjectURL(file);
                  if (avatarPreview) {
                    URL.revokeObjectURL(avatarPreview);
                  }
                  setAvatarFile(file);
                  setAvatarPreview(nextPreview);
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-fit rounded-xl"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending}
              >
                {t("chooseAvatar")}
              </Button>
              <span className="text-xs text-muted-foreground">{t("avatarHint")}</span>
            </div>
          </div>
        </label>

        <label className="grid gap-1 text-sm">
          {t("title")}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-xl border border-border/80 bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("titlePlaceholder")}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          {t("bio")}
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="min-h-40 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("bioPlaceholder")}
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          {t("skills")}
          <input
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="h-10 rounded-xl border border-border/80 bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("skillsPlaceholder")}
          />
        </label>

        <label className="grid gap-1 text-sm">
          {t("rate")}
          <input
            value={hourlyGEL}
            onChange={(e) => setHourlyGEL(e.target.value)}
            className="h-10 rounded-xl border border-border/80 bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("ratePlaceholder")}
            inputMode="numeric"
          />
        </label>

        <Button type="submit" size="sm" className="mt-2 rounded-xl" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>
    </Card>
  );
}
