import { prisma } from "@/lib/prisma";
import { requireDesktopAuth } from "@/lib/desktop-auth";
import { updateCampaignSchema } from "@/lib/validation";
import { errors, success, noContent } from "@/lib/api-response";
import { ensureCampaignRuntimeStarted } from "@/lib/campaign-runtime-init";

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/desktop/campaigns/:id — get single campaign ─────
export async function GET(
  req: Request,
  { params }: RouteContext,
) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;
    ensureCampaignRuntimeStarted();

    const { id } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        subject: true,
        senderName: true,
        senderEmail: true,
        html: true,
        status: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        totalCount: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
        updatedAt: true,
        desktopUserId: true,
      },
    });

    if (!campaign) return errors.notFound("Campaign");
    if (campaign.desktopUserId !== auth.user.id) return errors.forbidden();

    // Strip desktopUserId from response
    const { desktopUserId: _, ...data } = campaign;
    return success(data);
  } catch (err) {
    console.error("[Campaign Get] Error:", err);
    return errors.serverError();
  }
}

// ── PATCH /api/desktop/campaigns/:id — update draft campaign ─
export async function PATCH(
  req: Request,
  { params }: RouteContext,
) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;
    ensureCampaignRuntimeStarted();

    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = updateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    // Verify ownership and status
    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { desktopUserId: true, status: true },
    });

    if (!existing) return errors.notFound("Campaign");
    if (existing.desktopUserId !== auth.user.id) return errors.forbidden();
    if (existing.status !== "DRAFT") {
      return errors.badRequest("Only DRAFT campaigns can be edited");
    }

    const { scheduledAt, ...rest } = parsed.data;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        ...rest,
        ...(scheduledAt !== undefined
          ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }
          : {}),
      },
      select: {
        id: true,
        name: true,
        subject: true,
        senderName: true,
        senderEmail: true,
        status: true,
        scheduledAt: true,
        totalCount: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return success(campaign);
  } catch (err) {
    console.error("[Campaign Update] Error:", err);
    return errors.serverError();
  }
}

// ── DELETE /api/desktop/campaigns/:id — delete draft campaign ─
export async function DELETE(
  req: Request,
  { params }: RouteContext,
) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;
    ensureCampaignRuntimeStarted();

    const { id } = await params;

    const existing = await prisma.campaign.findUnique({
      where: { id },
      select: { desktopUserId: true, status: true },
    });

    if (!existing) return errors.notFound("Campaign");
    if (existing.desktopUserId !== auth.user.id) return errors.forbidden();
    if (existing.status !== "DRAFT") {
      return errors.badRequest("Only DRAFT campaigns can be deleted");
    }

    await prisma.campaign.delete({ where: { id } });

    return noContent();
  } catch (err) {
    console.error("[Campaign Delete] Error:", err);
    return errors.serverError();
  }
}
