import "server-only";

type ClaudeResult = { text: string; usedAi: boolean; warning: string };

export async function enhanceWithClaude(system: string, prompt: string, fallback: string): Promise<ClaudeResult> {
  const key = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return { text: fallback, usedAi: false, warning: "Claude is not configured. The built-in result was used." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 1200,
        temperature: 0.25,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return { text: fallback, usedAi: false, warning: `Claude was unavailable (HTTP ${response.status}). The built-in result was used.` };
    const data = await response.json().catch(() => ({})) as { content?: Array<{ type?: string; text?: string }>; stop_reason?: string };
    const text = (data.content || []).filter((part) => part.type === "text").map((part) => part.text || "").join("\n").trim();
    if (!text || data.stop_reason === "refusal") return { text: fallback, usedAi: false, warning: "Claude did not return a usable result. The built-in result was used." };
    return { text, usedAi: true, warning: "" };
  } catch {
    return { text: fallback, usedAi: false, warning: "Claude timed out or could not be reached. The built-in result was used." };
  } finally {
    clearTimeout(timer);
  }
}
