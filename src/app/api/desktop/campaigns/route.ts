import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDesktopAuth } from "@/lib/desktop-auth";
import {
  createCampaignSchema,
  listCampaignsSchema,
} from "@/lib/validation";
import { errors, created, successWithPagination } from "@/lib/api-response";
import { ensureCampaignRuntimeStarted } from "@/lib/campaign-runtime-init";
import {
  deriveDailySendTimeFromDate,
  nextDailyRunFrom,
} from "@/lib/campaign-schedule";
import type { CampaignStatus } from "@prisma/client";

// ── POST /api/desktop/campaigns — create campaign ────────────
export async function POST(req: Request) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;
    ensureCampaignRuntimeStarted();

    const body = await req.json().catch(() => null);
    if (!body) return errors.badRequest("Invalid JSON body");

    const parsed = createCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const {
      name,
      subject,
      senderName,
      senderEmail,
      html,
      scheduleMode,
      scheduledAt,
      dailyLimit,
      dailySendTime,
    } =
      parsed.data;

    let scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    let normalizedDailyLimit: number | null = null;
    let normalizedDailySendTime: string | null = null;

    if (scheduleMode === "DAILY") {
      normalizedDailyLimit = dailyLimit ?? null;
      normalizedDailySendTime =
        dailySendTime ||
        (scheduledDate ? deriveDailySendTimeFromDate(scheduledDate) : "10:00");
      if (!scheduledDate) {
        scheduledDate = nextDailyRunFrom(new Date(), normalizedDailySendTime);
      }
    }

    const campaign = await prisma.campaign.create({
      data: {
        desktopUserId: auth.user.id,
        name,
        subject,
        senderName: senderName ?? null,
        senderEmail: senderEmail ?? null,
        html,
        scheduleMode,
        scheduledAt: scheduledDate,
        dailyLimit: normalizedDailyLimit,
        dailySendTime: normalizedDailySendTime,
        dailySentOffset: 0,
        dailyTotalCount: null,
      },
      select: {
        id: true,
        name: true,
        subject: true,
        senderName: true,
        senderEmail: true,
        status: true,
        scheduleMode: true,
        scheduledAt: true,
        dailyLimit: true,
        dailySendTime: true,
        dailySentOffset: true,
        dailyTotalCount: true,
        totalCount: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return created(campaign);
  } catch (err) {
    console.error("[Campaign Create] Error:", err);
    return errors.serverError();
  }
}

// ── GET /api/desktop/campaigns — list campaigns ──────────────
export async function GET(req: Request) {
  try {
    const auth = await requireDesktopAuth(req);
    if (auth.error) return auth.error;
    ensureCampaignRuntimeStarted();

    const url = new URL(req.url);
    const parsed = listCampaignsSchema.safeParse({
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return errors.validationError(parsed.error.issues);
    }

    const { page, limit, status } = parsed.data;
    const skip = (page - 1) * limit;

    const where = {
      desktopUserId: auth.user.id,
      ...(status ? { status: status as CampaignStatus } : {}),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
        name: true,
        subject: true,
        status: true,
        scheduleMode: true,
        scheduledAt: true,
        dailyLimit: true,
        dailySendTime: true,
        dailySentOffset: true,
        dailyTotalCount: true,
        startedAt: true,
        completedAt: true,
        totalCount: true,
          sentCount: true,
          failedCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return successWithPagination(campaigns, {
      page,
      pageSize: limit,
      total,
    });
  } catch (err) {
    console.error("[Campaign List] Error:", err);
    return errors.serverError();
  }
}
