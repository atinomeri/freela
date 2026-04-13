import { prisma } from "@/lib/prisma";
import { requireDesktopAuth } from "@/lib/desktop-auth";
import { errors, noContent } from "@/lib/api-response";

type RouteContext = { params: Promise<{ id: string }> };

// DELETE /api/desktop/campaigns/:id/history — remove campaign from history
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;

    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { id: true, desktopUserId: true, status: true },
    });

    if (!campaign) return errors.notFound("Campaign");
    if (campaign.desktopUserId !== auth.user.id) return errors.forbidden();
    if (campaign.status === "SENDING" || campaign.status === "QUEUED") {
      return errors.badRequest("Cannot delete campaign history while campaign is active");
    }

    await prisma.$transaction([
      prisma.emailTrackingEvent.deleteMany({ where: { campaignId: id } }),
      prisma.campaignReport.deleteMany({ where: { campaignId: id } }),
      prisma.campaign.delete({ where: { id } }),
    ]);

    return noContent();
  } catch (err) {
    console.error("[Campaign History Delete] Error:", err);
    return errors.serverError();
  }
}
