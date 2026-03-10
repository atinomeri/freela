import { NextResponse } from 'next/server';

/**
 * Public API endpoint for desktop app version check
 * No authentication required - accessible to all app instances
 */
export async function GET() {
  return NextResponse.json({
    version: "1.0.2",
    url: "https://freela.ge/downloads/FreelaMailer_Setup_1.0.2.exe",
    release_notes: "🚀 Update 1.0.2 is here!\n- Added input masks for license keys.\n- Improved UI and performance."
  });
}
