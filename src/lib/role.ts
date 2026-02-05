export type AppRole = "EMPLOYER" | "FREELANCER" | "ADMIN";

export function roleLabel(role: AppRole | string | undefined, t?: (key: string) => string) {
  if (t) return t(role || "UNKNOWN");
  switch (role) {
    case "EMPLOYER":
      return "Employer";
    case "FREELANCER":
      return "Freelancer";
    case "ADMIN":
      return "Admin";
    default:
      return "Unknown";
  }
}

export function roleBadge(role: AppRole | string | undefined) {
  switch (role) {
    case "EMPLOYER":
      return "EMPLOYER";
    case "FREELANCER":
      return "FREELANCER";
    case "ADMIN":
      return "ADMIN";
    default:
      return "UNKNOWN";
  }
}

export function roleHome(role: AppRole | string | undefined) {
  if (role === "ADMIN") return "/admin";
  if (role === "EMPLOYER" || role === "FREELANCER") return "/dashboard";
  return "/";
}
