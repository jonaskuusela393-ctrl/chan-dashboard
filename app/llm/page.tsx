"use client";

import { useEffect, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function LlmPage() {
  const [model, setModel] = useState("llama3.1");
  const [input, setInput] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState("Local PC model through Vercel. Your PC bridge + tunnel must be running.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAccessKey(localStorage.getItem("dashboardAccessKey") || "");
    const savedModel = localStorage.getItem("localLlmModel");
    if (savedModel) setModel(savedModel);
  }, []);

  function saveAccessKey(value: string) {
    setAccessKey(value);
    localStorage.setItem("dashboardAccessKey", value);
  }

  function saveModel(value: string) {
    setModel(value);
    localStorage.setItem("localLlmModel", value);
  }

  async function send() {
    const prompt = input.trim();
    if (!prompt || loading) return;
    setInput("");
    setLoading(true);
    setStatus("Sending to your PC model...");
    const nextMessages: Msg[] = [...messages, { role: "user", content: prompt }];
    setMessages(nextMessages);
    try {
      const res = await fetch("/api/llm/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessKey ? { "x-dashboard-key": accessKey } : {})
        },
        body: JSON.stringify({ model, messages: nextMessages })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "LLM failed");
      setMessages([...nextMessages, { role: "assistant", content: data.reply || "" }]);
      setStatus(`Connected to local ${data.model || model}.`);
    } catch (e: any) {
      setStatus(e.message || "LLM failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <h1>Local LLM</h1>
      <p className="muted">
        Uses your PC model through a tunnel. The site can be opened from your phone anywhere, but replies only work while your PC, Ollama, the bridge, and the tunnel are running.
      </p>

      <div className="panel stack">
        <div className="row">
          <input value={model} onChange={e => saveModel(e.target.value)} placeholder="Ollama model, e.g. llama3.1" />
          <button onClick={() => setMessages([])}>clear chat</button>
        </div>
        <div className="row">
          <input value={accessKey} onChange={e => saveAccessKey(e.target.value)} placeholder="dashboard key, only if you set DASHBOARD_ACCESS_KEY" />
          <span className="muted small">{status}</span>
        </div>
      </div>

      <section className="stack">
        {messages.map((m, i) => <div className="post" key={i}>
          <b>{m.role === "user" ? "you" : "local llm"}</b>
          <pre>{m.content}</pre>
        </div>)}
      </section>

      <div className="panel stack">
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="message..." onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) send(); }} />
        <div className="row"><button onClick={send} disabled={loading}>send</button><span className="muted small">Ctrl+Enter sends.</span></div>
      </div>
    </div>
  );
}
