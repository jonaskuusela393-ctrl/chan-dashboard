"use client";

import { useState } from "react";

const DEFAULT_BASE = "http://127.0.0.1:43111";

type Msg = { role: "user" | "assistant"; content: string };

export default function LocalLlmPage() {
  const [base, setBase] = useState(DEFAULT_BASE);
  const [model, setModel] = useState("llama3.1");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState("Only works when the local LLM bridge and Ollama are running on this PC.");
  const [loading, setLoading] = useState(false);

  async function send() {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput(""); setLoading(true); setStatus("Thinking locally...");
    const nextMessages: Msg[] = [...messages, { role: "user", content: prompt }];
    setMessages(nextMessages);
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: nextMessages })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "local LLM failed");
      setMessages([...nextMessages, { role: "assistant", content: data.reply || "" }]);
      setStatus("Connected to local LLM.");
    } catch (e: any) {
      setStatus(`Offline or blocked: ${e.message || "cannot reach local LLM bridge"}`);
    } finally { setLoading(false); }
  }

  return (
    <div className="stack">
      <h1>Local LLM</h1>
      <p className="muted">The Vercel website only shows the UI. The actual model is called from your browser to this PC.</p>
      <div className="row panel">
        <input value={base} onChange={e => setBase(e.target.value)} style={{ minWidth: 260 }} />
        <input value={model} onChange={e => setModel(e.target.value)} placeholder="Ollama model" />
        <button onClick={() => setMessages([])}>clear chat</button>
        <span className="muted small">{status}</span>
      </div>
      <section className="stack">
        {messages.map((m, i) => <div className="post" key={i}>
          <b>{m.role === "user" ? "you" : "local llm"}</b>
          <pre>{m.content}</pre>
        </div>)}
      </section>
      <div className="panel stack">
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="message local model..." onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) send(); }} />
        <div className="row"><button onClick={send} disabled={loading}>send</button><span className="muted small">Ctrl+Enter also sends.</span></div>
      </div>
    </div>
  );
}
