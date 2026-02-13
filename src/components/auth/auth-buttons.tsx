"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

export function AuthButtons() {
  const t = useTranslations("authButtons");
  const { data, status } = useSession();

  if (status === "loading") {
    return <div className="hidden text-sm text-muted-foreground sm:block">...</div>;
  }

  if (!data?.user) {
    return (
      <>
        <ButtonLink href="/auth/login" variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl">
          {t("login")}
        </ButtonLink>
        <ButtonLink href="/auth/register" size="sm" className="hidden sm:inline-flex rounded-xl">
          {t("register")}
        </ButtonLink>
        <ButtonLink href="/auth/login" variant="secondary" size="sm" className="rounded-xl sm:hidden">
          {t("login")}
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <ButtonLink href="/dashboard" variant="secondary" size="sm" className="hidden rounded-xl sm:inline-flex">
        {t("dashboard")}
      </ButtonLink>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="hidden rounded-xl sm:inline-flex"
        onClick={() => {
          void signOut({ callbackUrl: "/" });
        }}
      >
        {t("logout")}
      </Button>
      <Link className="text-sm text-foreground/80 underline hover:text-foreground sm:hidden" href="/dashboard">
        {t("dashboard")}
      </Link>
    </>
  );
}
