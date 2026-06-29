export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");

  if (!target) {
    return new Response("Missing ?url=", { status: 400 });
  }

  const res = await fetch(target, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  let html = await res.text();

  // Basic sanitization
  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
