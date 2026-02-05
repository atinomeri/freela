"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { FREELANCER_CATEGORIES, isFreelancerCategory } from "@/lib/categories";
import { useTranslations } from "next-intl";

type Props = {
  initial: {
    q: string;
    category: string;
    minRate: string;
    maxRate: string;
    sort: "new" | "rate_asc" | "rate_desc";
  };
};

export function FreelancersFilters({ initial }: Props) {
  const t = useTranslations("filters");
  const tCategories = useTranslations("categories");
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [minRate, setMinRate] = useState(initial.minRate);
  const [maxRate, setMaxRate] = useState(initial.maxRate);
  const [sort, setSort] = useState<"new" | "rate_asc" | "rate_desc">(initial.sort);

  const baseParams = useMemo(() => {
    const params = new URLSearchParams(sp.toString());
    params.delete("page");
    return params;
  }, [sp]);

  const apply = () => {
    const params = new URLSearchParams(baseParams);
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");

    if (category && isFreelancerCategory(category)) params.set("category", category);
    else params.delete("category");

    if (minRate.trim()) params.set("minRate", minRate.trim());
    else params.delete("minRate");
    if (maxRate.trim()) params.set("maxRate", maxRate.trim());
    else params.delete("maxRate");

    if (sort === "rate_asc") params.set("sort", "rate_asc");
    else if (sort === "rate_desc") params.set("sort", "rate_desc");
    else params.delete("sort");

    router.push(`/freelancers?${params.toString()}`);
  };

  const clear = () => {
    setQ("");
    setCategory("");
    setMinRate("");
    setMaxRate("");
    setSort("new");
    router.push("/freelancers");
  };

  return (
    <div className="relative isolate rounded-xl border border-border bg-background/60 p-4">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("search")}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            placeholder={t("searchFreelancersPlaceholder")}
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("category")}</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="relative z-10 h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="">{t("allCategories")}</option>
            {FREELANCER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {tCategories(c.value)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("minRate")}</span>
          <input
            value={minRate}
            onChange={(e) => setMinRate(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            inputMode="numeric"
            placeholder="20"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("maxRate")}</span>
          <input
            value={maxRate}
            onChange={(e) => setMaxRate(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            inputMode="numeric"
            placeholder="100"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("sort")}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "new" | "rate_asc" | "rate_desc")}
            className="relative z-10 h-10 w-full rounded-lg border border-border bg-background/70 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="new">{t("sortNewest")}</option>
            <option value="rate_asc">{t("sortLowPrice")}</option>
            <option value="rate_desc">{t("sortHighPrice")}</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={apply}>
          {t("apply")}
        </Button>
        <Button type="button" variant="secondary" onClick={clear}>
          {t("clear")}
        </Button>
      </div>
    </div>
  );
}
