"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";

export function MessageComposer({ threadId }: { threadId: string }) {
  const t = useTranslations("messageComposer");
  const tApiErrors = useTranslations("apiErrors");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_FILES = 3;
  const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

  const pickedTotalBytes = useMemo(() => files.reduce((sum, f) => sum + (Number.isFinite(f.size) ? f.size : 0), 0), [files]);

  const formatBytes = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return "";
    if (n < 1024) return `${n} B`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const send = () => {
    const text = body.trim();
    if (text.length > 2000) {
      setError(t("errors.maxLength"));
      return;
    }
    if (text.length < 1 && files.length < 1) {
      setError(t("errors.required"));
      return;
    }
    setError("");
    startTransition(async () => {
      const form = new FormData();
      form.set("body", text);
      for (const f of files) form.append("files", f);

      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: "POST",
        body: form
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; errorCode?: string; maxFiles?: number } | null;
      if (!res.ok || !json?.ok) {
        if (json?.errorCode === "MAX_FILES" && typeof json?.maxFiles === "number") {
          setError(t("errors.maxFiles", { count: json.maxFiles }));
        } else {
          setError(json?.errorCode ? tApiErrors(json.errorCode) : json?.error || t("errors.sendFailed"));
        }
        return;
      }
      setBody("");
      setFiles([]);
      router.refresh();
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-24 w-full rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
        placeholder={t("placeholder")}
      />
      <div className="mt-3 grid gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                if (list.length > MAX_FILES) {
                  setError(t("errors.maxFiles", { count: MAX_FILES }));
                  e.target.value = "";
                  return;
                }
                const tooLarge = list.find((f) => f.size > MAX_FILE_BYTES);
                if (tooLarge) {
                  setError(t("errors.fileTooLarge", { size: formatBytes(MAX_FILE_BYTES) }));
                  e.target.value = "";
                  return;
                }
                setError("");
                setFiles(list);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 rounded-xl"
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              {t("pickFiles")}
            </Button>
            <div className="text-xs text-muted-foreground">
              {t("limits", { count: MAX_FILES, size: formatBytes(MAX_FILE_BYTES) })}
            </div>
          </div>

          <Button type="button" size="sm" className="rounded-xl" disabled={pending} onClick={send}>
            {pending ? t("sending") : t("send")}
          </Button>
        </div>

        {files.length > 0 ? (
          <div className="rounded-xl border border-border/80 bg-background/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {t("selected", { count: files.length, size: formatBytes(pickedTotalBytes) })}
              </div>
              <Button
                type="button"
                variant="ghost"
                  className="h-8 rounded-lg px-2 text-xs"
                disabled={pending}
                onClick={() => {
                  setFiles([]);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                {t("clear")}
              </Button>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {files.map((f) => (
                <div key={`${f.name}_${f.size}_${f.lastModified}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-background px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm">{f.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatBytes(f.size)}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={pending}
                    onClick={() => {
                      setFiles((prev) => prev.filter((x) => x !== f));
                      if (fileInputRef.current && files.length === 1) fileInputRef.current.value = "";
                    }}
                    aria-label={t("removeFile")}
                    title={t("removeFile")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
