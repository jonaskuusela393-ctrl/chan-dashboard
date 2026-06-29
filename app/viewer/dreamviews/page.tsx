"use client";

import { useEffect, useState, useRef } from "react";

export default function DreamviewsViewer() {
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/proxy?url=${encodeURIComponent("https://www.dreamviews.com")}`
        );

        const text = await res.text();
        setHtml(text);
      } catch (err) {
        setHtml(`<h2 style="color:red">Failed to load Dreamviews</h2>`);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function hide(type: "comments" | "threads" | "posts") {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const selectors = {
      comments: ["#comments", ".comments", ".comment", "div[id*=comment]"],
      threads: [".thread", ".topic", ".vbpostbit", ".postbit"],
      posts: [".post", ".message", ".postcontent", ".postbody"],
    };

    selectors[type].forEach((sel) => {
      doc.querySelectorAll(sel).forEach((el) => {
        (el as HTMLElement).style.display = "none";
      });
    });
  }

  return (
    <div className="container">
      <h1>Dreamviews Viewer</h1>

      <div style={{ marginBottom: 12, display: "flex", gap: 10 }}>
        <button className="action-button" onClick={() => hide("comments")}>
          Hide Comments
        </button>
        <button className="action-button" onClick={() => hide("threads")}>
          Hide Threads
        </button>
        <button className="action-button" onClick={() => hide("posts")}>
          Hide Posts
        </button>
      </div>

      <div className="card" style={{ height: "85vh", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 20 }}>Loading Dreamviews…</div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            sandbox="allow-same-origin allow-scripts"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: "#000",
            }}
          />
        )}
      </div>
    </div>
  );
}
