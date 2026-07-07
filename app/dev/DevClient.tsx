"use client";

import { useEffect, useMemo, useState } from "react";

type Node = {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  children?: Node[];
};

type Tab = "files" | "editor" | "terminal" | "preview";

function readJson(response: Response) {
  return response.text().then((text) => {
    if (!text) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { error: text };
    }
  });
}

function err(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function fileSize(bytes?: number) {
  if (!Number.isFinite(bytes || 0)) return "";
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function language(path: string) {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js") || path.endsWith(".mjs")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "text";
}

function Tree({ nodes, openFile, activePath }: { nodes: Node[]; openFile: (path: string) => void; activePath: string }) {
  return (
    <ul className="file-tree">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.type === "dir" ? (
            <details open={node.path === "app" || node.path === "lib" || node.path === "app/api"}>
              <summary>▸ {node.name}</summary>
              {node.children && <Tree nodes={node.children} openFile={openFile} activePath={activePath} />}
            </details>
          ) : (
            <button className={activePath === node.path ? "file-node active" : "file-node"} onClick={() => openFile(node.path)}>
              <span>□ {node.name}</span>
              <span className="muted small">{fileSize(node.size)}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function DevClient({ username }: { username: string }) {
  const [tab, setTab] = useState<Tab>("files");
  const [tree, setTree] = useState<Node[]>([]);
  const [root, setRoot] = useState("");
  const [path, setPath] = useState("app/page.tsx");
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [newPath, setNewPath] = useState("");
  const [renamePath, setRenamePath] = useState("");
  const [terminal, setTerminal] = useState("mobile dev workspace ready\n");
  const [customCommand, setCustomCommand] = useState("");
  const [commitMessage, setCommitMessage] = useState("dashboard update");
  const [previewUrl, setPreviewUrl] = useState("http://localhost:3000");
  const [status, setStatus] = useState("admin coding workspace ready");
  const [loading, setLoading] = useState(false);

  const dirty = content !== savedContent;
  const lang = useMemo(() => language(path), [path]);

  async function loadTree() {
    const response = await fetch("/api/dev/files?action=tree", { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) throw new Error(String(data.error || "tree failed"));
    setTree(Array.isArray(data.tree) ? data.tree as Node[] : []);
    setRoot(String(data.root || ""));
  }

  async function openFile(filePath = path) {
    setLoading(true);
    setStatus(`opening ${filePath}...`);
    try {
      const response = await fetch(`/api/dev/files?action=read&path=${encodeURIComponent(filePath)}`, { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "read failed"));
      setPath(String(data.path || filePath));
      setContent(String(data.content || ""));
      setSavedContent(String(data.content || ""));
      setTab("editor");
      setStatus(`opened ${filePath}`);
    } catch (error) {
      setStatus(err(error, "open failed"));
    } finally {
      setLoading(false);
    }
  }

  async function saveFile() {
    setLoading(true);
    setStatus(`saving ${path}...`);
    try {
      const response = await fetch("/api/dev/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", path, content }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "save failed"));
      setSavedContent(content);
      await loadTree();
      setStatus(`saved ${path}`);
    } catch (error) {
      setStatus(err(error, "save failed"));
    } finally {
      setLoading(false);
    }
  }

  async function writeAction(action: string, payload: Record<string, unknown>) {
    setLoading(true);
    try {
      const response = await fetch("/api/dev/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || `${action} failed`));
      await loadTree();
      setStatus(`${action} ok`);
    } catch (error) {
      setStatus(err(error, `${action} failed`));
    } finally {
      setLoading(false);
    }
  }

  async function runPreset(preset: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setTab("terminal");
    setTerminal((old) => `${old}\n[dashboard] running ${preset}...\n`);
    try {
      const response = await fetch("/api/dev/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, ...extra }),
      });
      const data = await readJson(response);
      const output = String(data.output || data.error || "");
      setTerminal((old) => `${old}\n${output}\n[exit ${String(data.code ?? (response.ok ? 0 : "error"))}]\n`);
      setStatus(response.ok && data.ok !== false ? `${preset} finished` : `${preset} failed`);
    } catch (error) {
      setTerminal((old) => `${old}\n${err(error, "command failed")}\n`);
      setStatus(err(error, "command failed"));
    } finally {
      setLoading(false);
    }
  }

  async function runCustom() {
    setLoading(true);
    setTab("terminal");
    try {
      const response = await fetch("/api/dev/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: customCommand }),
      });
      const data = await readJson(response);
      setTerminal((old) => `${old}\n${String(data.output || data.error || "")}\n`);
      setStatus(response.ok ? "custom command finished" : "custom command blocked/failed");
    } catch (error) {
      setTerminal((old) => `${old}\n${err(error, "custom command failed")}\n`);
      setStatus(err(error, "custom command failed"));
    } finally {
      setLoading(false);
    }
  }

  function copyFixPrompt() {
    const prompt = `Fix this file for my Next.js dashboard. Give me a full-file replacement only, copy-paste ready, with no missing imports.\n\nFILE: ${path}\n\n\`\`\`${lang}\n${content}\n\`\`\``;
    void navigator.clipboard.writeText(prompt).then(
      () => setStatus("ChatGPT fix prompt copied"),
      () => setStatus("clipboard failed")
    );
  }

  useEffect(() => {
    void loadTree().then(() => openFile("app/page.tsx")).catch((error) => setStatus(err(error, "workspace load failed")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">ADMIN ONLY</p>
            <h1 className="terminal-title">Mobile dev workspace</h1>
            <p className="muted">Signed in as {username}. Phone-friendly file explorer, editor, terminal buttons, preview, and ChatGPT prompt helper.</p>
          </div>
          <div className="row">
            <a className="buttonlike" href="/api/dev/export">download ZIP</a>
            <button onClick={() => void loadTree()} disabled={loading}>refresh tree</button>
          </div>
        </div>
        <p className="muted small">Root: {root || "loading..."}</p>
        <p className="muted small">Status: {status}{dirty ? " · unsaved changes" : ""}</p>
        <div className="mobile-tabs row">
          <button className={tab === "files" ? "active-btn" : ""} onClick={() => setTab("files")}>Files</button>
          <button className={tab === "editor" ? "active-btn" : ""} onClick={() => setTab("editor")}>Editor</button>
          <button className={tab === "terminal" ? "active-btn" : ""} onClick={() => setTab("terminal")}>Terminal</button>
          <button className={tab === "preview" ? "active-btn" : ""} onClick={() => setTab("preview")}>Preview</button>
        </div>
      </section>

      <div className="dev-layout">
        <section className={`panel stack dev-pane ${tab !== "files" ? "mobile-hidden" : ""}`}>
          <h2>Files</h2>
          <div className="row">
            <input value={newPath} onChange={(event) => setNewPath(event.target.value)} placeholder="app/new-file.tsx or folder/name" />
            <button onClick={() => void writeAction("write", { path: newPath, content: "" })} disabled={!newPath || loading}>new file</button>
            <button onClick={() => void writeAction("mkdir", { path: newPath })} disabled={!newPath || loading}>new folder</button>
          </div>
          <Tree nodes={tree} openFile={(p) => void openFile(p)} activePath={path} />
        </section>

        <section className={`panel stack dev-pane editor-pane ${tab !== "editor" ? "mobile-hidden" : ""}`}>
          <div className="spread">
            <div>
              <h2>Editor</h2>
              <p className="muted small">{path} · {lang} · {dirty ? "dirty" : "saved"}</p>
            </div>
            <div className="row">
              <button onClick={() => void saveFile()} disabled={loading || !dirty}>save</button>
              <button onClick={copyFixPrompt}>copy fix prompt</button>
              <button onClick={() => void runPreset("build")} disabled={loading}>build</button>
            </div>
          </div>
          <label className="stack small">Current path
            <input value={path} onChange={(event) => setPath(event.target.value)} onBlur={() => void openFile(path)} />
          </label>
          <textarea className="code-editor" spellCheck={false} value={content} onChange={(event) => setContent(event.target.value)} />
          <div className="row">
            <input value={renamePath} onChange={(event) => setRenamePath(event.target.value)} placeholder="rename/move current file to..." />
            <button onClick={() => void writeAction("rename", { path, to: renamePath }).then(() => { if (renamePath) void openFile(renamePath); })} disabled={!renamePath || loading}>rename</button>
            <button className="danger" onClick={() => void writeAction("delete", { path })} disabled={!path || loading}>X delete</button>
          </div>
        </section>

        <section className={`panel stack dev-pane ${tab !== "terminal" ? "mobile-hidden" : ""}`}>
          <h2>Terminal</h2>
          <div className="grid tight-grid">
            <button onClick={() => void runPreset("build")} disabled={loading}>build</button>
            <button onClick={() => void runPreset("install")} disabled={loading}>install</button>
            <button onClick={() => void runPreset("git-status")} disabled={loading}>git status</button>
            <button onClick={() => void runPreset("git-diff")} disabled={loading}>git diff</button>
            <button onClick={() => void runPreset("git-pull")} disabled={loading}>git pull</button>
            <button onClick={() => void runPreset("git-add")} disabled={loading}>git add .</button>
          </div>
          <div className="row">
            <input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} placeholder="commit message" />
            <button onClick={() => void runPreset("git-commit", { message: commitMessage })} disabled={loading}>commit</button>
            <button onClick={() => void runPreset("git-push")} disabled={loading}>push</button>
          </div>
          <div className="row">
            <input value={customCommand} onChange={(event) => setCustomCommand(event.target.value)} placeholder="custom command needs DEV_ALLOW_ARBITRARY_COMMANDS=true" />
            <button onClick={() => void runCustom()} disabled={loading || !customCommand}>run custom</button>
          </div>
          <pre className="terminal-output">{terminal}</pre>
        </section>

        <section className={`panel stack dev-pane ${tab !== "preview" ? "mobile-hidden" : ""}`}>
          <h2>Preview</h2>
          <p className="muted small">Start dev server normally on the PC, then open its URL here. Long-running dev server is not launched by the dashboard terminal.</p>
          <div className="row">
            <input value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} />
            <button onClick={() => setPreviewUrl((old) => old)}>reload</button>
          </div>
          <iframe className="preview-frame" src={previewUrl} title="Local preview" />
        </section>
      </div>
    </div>
  );
}
