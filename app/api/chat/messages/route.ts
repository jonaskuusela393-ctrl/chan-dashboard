import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { addChatMessage, touchPresence, type ChatAttachment } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime"]);
function jsonError(error: string, status = 500) { return NextResponse.json({ ok: false, error }, { status }); }
function maxBytes() { return Math.max(1, Math.min(Number(process.env.CHAT_MAX_UPLOAD_MB || 4), 4)) * 1024 * 1024; }

function safeName(value: string) {
  const cleaned = value.normalize("NFKC").replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return cleaned || "attachment";
}

function signatureMatches(type: string, bytes: Uint8Array) {
  const hex = (start: number, length: number) => Buffer.from(bytes.slice(start, start + length)).toString("hex");
  if (type === "image/jpeg") return hex(0, 3) === "ffd8ff";
  if (type === "image/png") return hex(0, 8) === "89504e470d0a1a0a";
  if (type === "image/gif") return ["474946383761", "474946383961"].includes(hex(0, 6));
  if (type === "image/webp") return hex(0, 4) === "52494646" && hex(8, 4) === "57454250";
  if (type === "video/webm") return hex(0, 4) === "1a45dfa3";
  if (type === "video/mp4" || type === "video/quicktime") return Buffer.from(bytes.slice(4, 12)).toString("ascii").includes("ftyp");
  return false;
}

function canUseLocalDatabaseAttachments() {
  return process.env.NODE_ENV !== "production" || process.env.CHAT_ALLOW_DATABASE_ATTACHMENTS === "1";
}

export async function POST(req: NextRequest) {
  try {
    const session = requireSession(req);
    const form = await req.formData();
    const body = String(form.get("body") || "").trim().slice(0, 4000);
    const files = form.getAll("files").filter((v): v is File => v instanceof File).slice(0, 4);
    const attachments: ChatAttachment[] = [];
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

    if (totalBytes > maxBytes()) throw new Error(`Combined attachments are too large. Max ${Math.floor(maxBytes() / 1024 / 1024)} MB per message.`);

    for (const file of files) {
      if (!ALLOWED.has(file.type)) throw new Error(`File type not allowed: ${file.type || file.name}`);
      if (file.size > maxBytes()) throw new Error(`${file.name} is too large. Max ${Math.floor(maxBytes() / 1024 / 1024)} MB.`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!signatureMatches(file.type, bytes)) throw new Error(`${file.name} does not match its claimed file type.`);

      const displayName = file.name.slice(0, 120);
      const pathname = `chat/${session.username}/${Date.now()}-${crypto.randomBytes(5).toString("hex")}-${safeName(file.name)}`;
      try {
        const blob = await put(pathname, Buffer.from(bytes), {
          access: "private",
          contentType: file.type,
          addRandomSuffix: false,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
        });
        attachments.push({
          name: displayName,
          type: file.type,
          size: file.size,
          dataUrl: `/api/chat/file?pathname=${encodeURIComponent(blob.pathname)}`,
        });
      } catch (error) {
        if (!canUseLocalDatabaseAttachments()) {
          throw new Error("Chat file storage is not configured. Connect a private Vercel Blob store to this project, then redeploy.");
        }
        attachments.push({ name: displayName, type: file.type, size: file.size, dataUrl: `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}` });
      }
    }

    if (!body && attachments.length === 0) return jsonError("empty message", 400);
    await touchPresence(session.username, session.role);
    const message = await addChatMessage(session.username, session.role, body, attachments);
    return NextResponse.json({ ok: true, message });
  } catch (error: any) {
    return jsonError(error?.message || "Message failed", error?.message === "Not logged in" ? 401 : 400);
  }
}
