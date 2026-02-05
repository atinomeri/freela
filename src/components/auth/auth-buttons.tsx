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
        <ButtonLink href="/auth/login" variant="ghost" className="hidden sm:inline-flex">
          {t("login")}
        </ButtonLink>
        <ButtonLink href="/auth/register" className="hidden sm:inline-flex">
          {t("register")}
        </ButtonLink>
        <ButtonLink href="/auth/login" variant="secondary" className="sm:hidden">
          {t("login")}
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      <ButtonLink href="/dashboard" variant="secondary" className="hidden sm:inline-flex">
        {t("dashboard")}
      </ButtonLink>
      <Button
        type="button"
        variant="ghost"
        className="hidden sm:inline-flex"
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
