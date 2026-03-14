import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_id,
      hwid,
      license_key,
      total,
      sent,
      failed,
      started_at,
      finished_at,
      events
    } = body;

    if (!campaign_id || !hwid) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: campaign_id or hwid" },
        { status: 400 }
      );
    }

    // Parse unix timestamps to Date objects if they exist
    let startedAtDate = new Date();
    let finishedAtDate = new Date();

    if (started_at) {
      // client sends float unix timestamps (seconds)
      startedAtDate = new Date(started_at * 1000);
    }
    
    if (finished_at) {
      finishedAtDate = new Date(finished_at * 1000);
    }

    // Save report to database. Using upsert to prevent duplicate errors 
    // if client retries the same campaign_id.
    await prisma.campaignReport.upsert({
      where: {
        campaignId: campaign_id,
      },
      update: {
        hwid,
        licenseKey: license_key || null,
        total: total || 0,
        sent: sent || 0,
        failed: failed || 0,
        startedAt: startedAtDate,
        finishedAt: finishedAtDate,
        events: events || null, // storing as JSON
      },
      create: {
        campaignId: campaign_id,
        hwid,
        licenseKey: license_key || null,
        total: total || 0,
        sent: sent || 0,
        failed: failed || 0,
        startedAt: startedAtDate,
        finishedAt: finishedAtDate,
        events: events || null,
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[Tracking Report] Error saving report:", e);
    return NextResponse.json(
      { ok: false, error: "Invalid request body or database error" },
      { status: 400 }
    );
  }
}
