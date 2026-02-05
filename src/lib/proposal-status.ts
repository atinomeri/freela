export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export function proposalStatusLabel(
  status: ProposalStatus | string | undefined,
  t?: (key: string) => string
) {
  if (t) return t(status || "PENDING");
  switch (status) {
    case "ACCEPTED":
      return "Accepted";
    case "REJECTED":
      return "Rejected";
    case "PENDING":
    default:
      return "Pending";
  }
}
