import { requireDesktopAuth } from "@/lib/desktop-auth";
import { success } from "@/lib/api-response";

export async function GET(req: Request) {
  const auth = await requireDesktopAuth(req);
  if (auth.error) return auth.error;

  return success({
    email: auth.user.email,
    balance: auth.user.balance,
  });
}
