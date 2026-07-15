import { NextRequest, NextResponse } from "next/server";
import { authStatus, requireAdmin } from "@/lib/auth";
import { parseStreamSource, type StreamSource } from "@/lib/streamSources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const STREAM_LIST_URL = "https://gist.githubusercontent.com/BestestCreature/53b495e6b30595283967c4817e33cfc0/raw/";
const MAX_BYTES = 64 * 1024;

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const response = await fetch(STREAM_LIST_URL, {
      headers: { "User-Agent": "Raccoon-North-Stream-List/1.0", Accept: "text/plain" },
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Stream list returned ${response.status}`);

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_BYTES) throw new Error("Stream list is too large");
    const text = (await response.text()).slice(0, MAX_BYTES);
    const sources: StreamSource[] = [];
    let skipped = 0;

    for (const line of text.split(/\r?\n/).slice(0, 200)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [name = "", url = "", ...descriptionParts] = trimmed.split(";");
      const source = parseStreamSource(url, {
        label: name,
        description: descriptionParts.join(";"),
        origin: "gist",
        allowCustomEmbed: false,
      });
      if (!source) {
        skipped += 1;
        continue;
      }
      if (!sources.some((item) => item.id === source.id)) sources.push(source);
    }

    return NextResponse.json({
      ok: true,
      sources: sources.slice(0, 100),
      skipped,
      fetchedAt: new Date().toISOString(),
      note: "The remote file was parsed as data. No remote JavaScript was executed.",
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stream list request failed", sources: [] },
      { status: authStatus(error) === 500 ? 502 : authStatus(error) },
    );
  }
}
