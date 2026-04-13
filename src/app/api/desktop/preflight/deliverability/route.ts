import { requireDesktopAuth } from "@/lib/desktop-auth";
import { errors, success } from "@/lib/api-response";
import { mailerDeliverabilitySchema } from "@/lib/validation";
import { checkDeliverability } from "@/lib/mailer-preflight";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;

    const url = new URL(req.url);
    const parsed = mailerDeliverabilitySchema.safeParse({
      senderEmail: url.searchParams.get("senderEmail") ?? undefined,
      domain: url.searchParams.get("domain") ?? undefined,
      dkimSelectors: url.searchParams.getAll("dkimSelector"),
    });
    if (!parsed.success) return errors.validationError(parsed.error.issues);

    let target = parsed.data.senderEmail || parsed.data.domain || "";
    if (!target) {
      const smtp = await prisma.desktopSmtpConfig.findUnique({
        where: { desktopUserId: auth.user.id },
        select: { fromEmail: true, username: true },
      });
      target = smtp?.fromEmail || smtp?.username || auth.user.email;
    }

    const report = await checkDeliverability(target, parsed.data.dkimSelectors);
    return success(report);
  } catch (err) {
    console.error("[Preflight Deliverability] Error:", err);
    return errors.serverError();
  }
}

