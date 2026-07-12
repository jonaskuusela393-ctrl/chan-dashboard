import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { getGmailAttachment } from "@/lib/gmailApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const messageId = req.nextUrl.searchParams.get("messageId") || "";
    const attachmentId = req.nextUrl.searchParams.get("attachmentId") || "";
    if (!messageId || !attachmentId) return NextResponse.json({ ok: false, error: "messageId and attachmentId are required" }, { status: 400 });
    const filename = (req.nextUrl.searchParams.get("filename") || "attachment").replace(/[\r\n"\\/]/g, "_").slice(0, 180);
    const mimeType = (req.nextUrl.searchParams.get("type") || "application/octet-stream").replace(/[\r\n]/g, "");
    const attachment = await getGmailAttachment(messageId, attachmentId);
    return new NextResponse(attachment.data, { headers: { "Content-Type": mimeType, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Attachment load failed" }, { status: authStatus(error) });
  }
}
