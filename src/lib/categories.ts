export const FREELANCER_CATEGORY_VALUES = [
  "IT_DEVELOPMENT",
  "DESIGN_CREATIVE",
  "MARKETING_CONTENT",
  "FINANCE",
  "LOGISTICS",
  "BUSINESS_ADMIN",
  "CONSTRUCTION",
  "TRANSPORT",
  "OTHER"
] as const;

export type FreelancerCategory = (typeof FREELANCER_CATEGORY_VALUES)[number];

export const FREELANCER_CATEGORIES: ReadonlyArray<{ value: FreelancerCategory }> = FREELANCER_CATEGORY_VALUES.map(
  (value) => ({ value })
);

const DEFAULT_LABELS_EN: Record<FreelancerCategory, string> = {
  IT_DEVELOPMENT: "IT / Development",
  DESIGN_CREATIVE: "Design / Creative",
  MARKETING_CONTENT: "Marketing / Content",
  FINANCE: "Finance",
  LOGISTICS: "Logistics",
  BUSINESS_ADMIN: "Business / Administrative",
  CONSTRUCTION: "Construction",
  TRANSPORT: "Transport",
  OTHER: "Other"
};

export function isFreelancerCategory(value: unknown): value is FreelancerCategory {
  return typeof value === "string" && (FREELANCER_CATEGORY_VALUES as readonly string[]).includes(value);
}

export function getFreelancerCategoryLabel(
  value: FreelancerCategory | null | undefined,
  t?: (key: FreelancerCategory) => string
) {
  if (!value) return "";
  if (t) return t(value);
  return DEFAULT_LABELS_EN[value] ?? value;
}
