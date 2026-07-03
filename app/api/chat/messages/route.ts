import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { addChatMessage, touchPresence, type ChatAttachment } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime"]);
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error }, { status }); }
function maxBytes() { return Math.max(1, Math.min(Number(process.env.CHAT_MAX_UPLOAD_MB || 4), 20)) * 1024 * 1024; }

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const form = await req.formData();
    const body = String(form.get("body") || "").trim().slice(0, 4000);
    const files = form.getAll("files").filter((v): v is File => v instanceof File);
    const attachments: ChatAttachment[] = [];

    for (const file of files.slice(0, 4)) {
      if (!ALLOWED.has(file.type)) throw new Error(`File type not allowed: ${file.type || file.name}`);
      if (file.size > maxBytes()) throw new Error(`${file.name} is too large. Max ${process.env.CHAT_MAX_UPLOAD_MB || 4} MB.`);
      const buf = Buffer.from(await file.arrayBuffer());
      attachments.push({ name: file.name.slice(0, 120), type: file.type, size: file.size, dataUrl: `data:${file.type};base64,${buf.toString("base64")}` });
    }

    if (!body && attachments.length === 0) return jsonError("empty message", 400);
    await touchPresence(session.username, session.role);
    const message = await addChatMessage(session.username, session.role, body, attachments);
    return NextResponse.json({ ok: true, message });
  } catch (error: any) {
    return jsonError(error?.message || "Message failed", error?.message === "Not logged in" ? 401 : 500);
  }
}
