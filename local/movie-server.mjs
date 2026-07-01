import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.MOVIE_PORT || 43110);
const MOVIE_DIR = process.env.MOVIE_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "movies");
const ALLOWED_ORIGIN = process.env.LOCAL_ALLOWED_ORIGIN || "*";
const videoExts = new Set([".mp4", ".mkv", ".webm", ".mov", ".m4v", ".avi", ".mpg", ".mpeg", ".ts"]);
const subtitleExts = new Set([".vtt", ".srt"]);
const mime = {
  ".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime",
  ".mkv": "video/x-matroska", ".avi": "video/x-msvideo", ".mpg": "video/mpeg", ".mpeg": "video/mpeg", ".ts": "video/mp2t"
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
}
function sendJson(res, code, data) {
  cors(res);
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
function safePath(name) {
  const decoded = decodeURIComponent(name || "").replaceAll("\\", "/");
  const full = path.resolve(MOVIE_DIR, decoded);
  const root = path.resolve(MOVIE_DIR);
  if (!full.startsWith(root + path.sep) && full !== root) throw new Error("bad path");
  return full;
}
function webPath(rel) { return rel.replaceAll(path.sep, "/"); }
function mediaUrl(rel) { return `/media/${encodeURIComponent(webPath(rel))}`; }
function subtitleUrl(rel) { return `/subtitle/${encodeURIComponent(webPath(rel))}`; }
function stripExt(name) { return name.replace(/\.[^.]+$/, "").toLowerCase(); }

async function walk(dir, rel = "") {
  const out = [];
  const items = await fs.promises.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const item of items) {
    const full = path.join(dir, item.name);
    const r = path.join(rel, item.name);
    if (item.isDirectory()) out.push(...await walk(full, r));
    else out.push({ full, rel: r, ext: path.extname(item.name).toLowerCase() });
  }
  return out;
}

async function listFiles() {
  const all = await walk(MOVIE_DIR);
  const subtitles = all.filter(x => subtitleExts.has(x.ext));
  const videos = [];
  for (const file of all.filter(x => videoExts.has(x.ext))) {
    const stat = await fs.promises.stat(file.full);
    const base = stripExt(path.basename(file.rel));
    const dir = path.dirname(file.rel);
    const subs = subtitles.filter(s => path.dirname(s.rel) === dir && stripExt(path.basename(s.rel)).startsWith(base)).map((s, i) => ({
      name: webPath(s.rel),
      label: path.basename(s.rel),
      srclang: i === 0 ? "en" : `x-${i + 1}`,
      url: subtitleUrl(s.rel)
    }));
    videos.push({ name: webPath(file.rel), size: stat.size, url: mediaUrl(file.rel), subtitles: subs });
  }
  return videos.sort((a, b) => a.name.localeCompare(b.name));
}

function srtToVtt(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return normalized.startsWith("WEBVTT") ? normalized : `WEBVTT\n\n${normalized}`;
}

async function streamFile(req, res, full) {
  const stat = await fs.promises.stat(full);
  const ext = path.extname(full).toLowerCase();
  const range = req.headers.range;
  cors(res);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = Math.max(0, Number(startStr) || 0);
    const end = Math.min(stat.size - 1, endStr ? Number(endStr) : stat.size - 1);
    if (start > end) { res.writeHead(416); res.end(); return; }
    res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": end - start + 1 });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(full, { start, end }).pipe(res);
  } else {
    res.writeHead(200, { "Content-Length": stat.size });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(full).pipe(res);
  }
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  try {
    if (url.pathname === "/api/list") {
      sendJson(res, 200, { root: MOVIE_DIR, files: await listFiles() });
      return;
    }
    if (url.pathname.startsWith("/media/")) {
      await streamFile(req, res, safePath(url.pathname.replace("/media/", "")));
      return;
    }
    if (url.pathname.startsWith("/subtitle/")) {
      const full = safePath(url.pathname.replace("/subtitle/", ""));
      const ext = path.extname(full).toLowerCase();
      if (!subtitleExts.has(ext)) throw new Error("not a subtitle");
      let text = await fs.promises.readFile(full, "utf8");
      if (ext === ".srt") text = srtToVtt(text);
      cors(res);
      res.writeHead(200, { "Content-Type": "text/vtt; charset=utf-8" });
      res.end(text);
      return;
    }
    sendJson(res, 404, { error: "not found" });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`movie server: http://127.0.0.1:${PORT}`);
  console.log(`movie folder: ${MOVIE_DIR}`);
  console.log("Set MOVIE_DIR=C:\\path\\to\\movies before starting if you want another folder.");
});
