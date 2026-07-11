import net from "node:net";
import tls from "node:tls";
import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type SendOptions = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  body: string;
};

function jsonError(error: string, status = 500) {
  return NextResponse.json({ ok: false, error }, { status });
}

function clean(value: unknown, max = 5000) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function cleanHeader(value: unknown, max = 500) {
  return clean(value, max).replace(/[\r\n]+/g, " ").trim();
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function extractEmail(value: string) {
  const match = value.match(/<([^<>\s@]+@[^<>\s@]+\.[^<>\s@]+)>/);
  if (match?.[1]) return match[1];
  const direct = value.match(/[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+/);
  return direct?.[0] || value;
}

function b64(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function mimeHeader(value: string) {
  const safe = cleanHeader(value, 500);
  return /^[\x00-\x7f]*$/.test(safe) ? safe : `=?UTF-8?B?${b64(safe)}?=`;
}

function escapeData(value: string) {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function smtpSend(options: SendOptions) {
  return new Promise<string>((resolve, reject) => {
    const timeoutMs = 25_000;
    let buffer = "";
    let settled = false;
    let socket: net.Socket | tls.TLSSocket;

    function finish(error?: Error, value?: string) {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(value || "sent");
    }

    function write(line: string) {
      socket.write(`${line}\r\n`);
    }

    function readCode() {
      return new Promise<{ code: number; text: string }>((resolveRead, rejectRead) => {
        const onData = (chunk: Buffer) => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split(/\r?\n/);
          const complete = lines.find((line) => /^\d{3} /.test(line));
          if (!complete) return;
          socket.off("data", onData);
          const text = buffer.trim();
          buffer = "";
          const code = Number(complete.slice(0, 3));
          resolveRead({ code, text });
        };
        socket.on("data", onData);
        socket.once("error", rejectRead);
      });
    }

    async function expect(okCodes: number[], command?: string) {
      if (command) write(command);
      const response = await readCode();
      if (!okCodes.includes(response.code)) {
        throw new Error(`SMTP ${response.code}: ${response.text}`);
      }
      return response;
    }

    async function run() {
      await expect([220]);
      await expect([250], "EHLO localhost");

      if (!options.secure) {
        await expect([220], "STARTTLS");
        const secureSocket = tls.connect({ socket, servername: options.host });
        socket = secureSocket;
        buffer = "";
        await new Promise<void>((resolveTls, rejectTls) => {
          secureSocket.once("secureConnect", () => resolveTls());
          secureSocket.once("error", rejectTls);
        });
        await expect([250], "EHLO localhost");
      }

      await expect([334], "AUTH LOGIN");
      await expect([334], b64(options.user));
      await expect([235], b64(options.pass));

      const fromEmail = extractEmail(options.from);
      await expect([250], `MAIL FROM:<${fromEmail}>`);
      await expect([250, 251], `RCPT TO:<${options.to}>`);
      await expect([354], "DATA");

      const now = new Date().toUTCString();
      const raw = [
        `From: ${options.from}`,
        `To: ${options.to}`,
        `Subject: ${mimeHeader(options.subject)}`,
        `Date: ${now}`,
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=utf-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        escapeData(options.body),
        ".",
      ].join("\r\n");
      write(raw);
      const queued = await expect([250]);
      write("QUIT");
      finish(undefined, queued.text || "sent");
    }

    socket = options.secure
      ? tls.connect({ host: options.host, port: options.port, servername: options.host })
      : net.connect({ host: options.host, port: options.port });

    socket.setTimeout(timeoutMs, () => finish(new Error("SMTP timed out")));
    socket.once("error", (error) => finish(error));
    socket.once("connect", () => {
      if (!options.secure) void run().catch((error) => finish(error));
    });
    if (options.secure && socket instanceof tls.TLSSocket) {
      socket.once("secureConnect", () => void run().catch((error) => finish(error)));
    }
  });
}

function getSmtpOptions(to: string, subject: string, message: string): SendOptions | null {
  const user = clean(process.env.GMAIL_USER || process.env.SMTP_USER, 320);
  const pass = clean(process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS, 500);
  const from = clean(process.env.EMAIL_FROM || process.env.SMTP_FROM || user, 500);
  if (!user || !pass || !from) return null;

  return {
    host: clean(process.env.SMTP_HOST || "smtp.gmail.com", 200),
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE ?? "true").toLowerCase() !== "false",
    user,
    pass,
    from,
    to,
    subject,
    body: message,
  };
}

async function sendResend(to: string, subject: string, message: string) {
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM || "";
  const key = process.env.RESEND_API_KEY || "";
  if (!key || !from) return null;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text: message }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || data?.error || `Resend returned ${response.status}`);
  return data?.id || "sent";
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const to = clean(body.to, 320);
    const subject = cleanHeader(body.subject, 180);
    const message = clean(body.body, 10000);
    const provider = clean(body.provider || process.env.EMAIL_PROVIDER || "auto", 20).toLowerCase();

    if (!validEmail(to)) return jsonError("Recipient email is missing or invalid", 400);
    if (!subject || !message) return jsonError("Subject and body are required", 400);

    if (provider === "gmail" || provider === "smtp" || provider === "auto") {
      const smtp = getSmtpOptions(to, subject, message);
      if (smtp) {
        const id = await smtpSend(smtp);
        return NextResponse.json({ ok: true, provider: "smtp", id });
      }
      if (provider === "gmail" || provider === "smtp") {
        return jsonError("Gmail/SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD, or SMTP_USER and SMTP_PASS.", 500);
      }
    }

    if (provider === "resend" || provider === "auto") {
      const id = await sendResend(to, subject, message);
      if (id) return NextResponse.json({ ok: true, provider: "resend", id });
      if (provider === "resend") return jsonError("RESEND_API_KEY and EMAIL_FROM are not set.", 500);
    }

    return jsonError("No email sender is configured. Use copy/open Gmail mode, or set Gmail SMTP/app-password env variables.", 500);
  } catch (error: any) {
    return jsonError(error?.message || "Email send failed", authStatus(error));
  }
}
