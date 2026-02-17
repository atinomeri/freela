import { NextResponse } from "next/server";
import fs from "node:fs";
import { getAttachmentAbsolutePath } from "@/lib/uploads";

export const runtime = "nodejs";

const FALLBACK_CONTENT_TYPE = "application/octet-stream";

function isValidAvatarPath(path: string) {
  return path.startsWith("avatars/") && !path.includes("..");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storagePath = searchParams.get("path")?.trim() ?? "";
  if (!storagePath || !isValidAvatarPath(storagePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let absPath = "";
  try {
    absPath = getAttachmentAbsolutePath(storagePath);
    if (!fs.existsSync(absPath)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const stat = fs.statSync(absPath);
    if (!stat.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const contentType =
      storagePath.endsWith(".png")
        ? "image/png"
        : storagePath.endsWith(".jpg") || storagePath.endsWith(".jpeg")
          ? "image/jpeg"
          : storagePath.endsWith(".webp")
            ? "image/webp"
            : storagePath.endsWith(".gif")
              ? "image/gif"
              : FALLBACK_CONTENT_TYPE;

    const data = fs.readFileSync(absPath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
