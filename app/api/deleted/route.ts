import { NextRequest, NextResponse } from "next/server";
import { addDeleted, hasDatabase, listDeleted } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, max = 300) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

function cleanScope(value: unknown) {
  return cleanText(value, 80)
    .replace(/[^a-z0-9_-]/gi, "")
    .toLowerCase();
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function jsonError(error: string, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      db: hasDatabase(),
      error,
    },
    { status }
  );
}

export async function GET(req: NextRequest) {
  const scope = cleanScope(req.nextUrl.searchParams.get("scope"));

  if (!scope) {
    return jsonError("missing scope", 400);
  }

  if (!hasDatabase()) {
    return NextResponse.json({
      ok: true,
      db: false,
      scope,
      keys: [],
      rows: [],
      warning: "DATABASE_URL is not set",
    });
  }

  try {
    const rows = await listDeleted(scope);

    return NextResponse.json({
      ok: true,
      db: true,
      scope,
      keys: rows.map((row) => row.item_key),
      rows,
    });
  } catch (error) {
    console.error("DELETED GET ERROR:", error);

    return jsonError(
      errorMessage(
        error,
        "Could not load deleted items. Check DATABASE_URL and Neon table migration."
      ),
      500
    );
  }
}

export async function POST(req: NextRequest) {
  if (!hasDatabase()) {
    return jsonError("DATABASE_URL is not set. Permanent delete cannot be saved.", 500);
  }

  try {
    const body = await req.json().catch(() => ({}));

    const scope = cleanScope(body.scope);
    const key = cleanText(body.key || body.itemKey, 500);
    const label = cleanText(body.label || key, 300);

    if (!scope || !key) {
      return jsonError("missing scope or key", 400);
    }

    await addDeleted(scope, key, label);

    return NextResponse.json({
      ok: true,
      db: true,
      scope,
      key,
    });
  } catch (error) {
    console.error("DELETED POST ERROR:", error);

    return jsonError(errorMessage(error, "delete failed"), 500);
  }
}