"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_MODEL = "llama3.1";

function readJsonOrText(response: Response) {
  return response.text().then((text) => {
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { error: text };
    }
  });
}

function nowTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanModel(value: string) {
  return value.trim().slice(0, 80) || DEFAULT_MODEL;
}

function cleanAccessKey(value: string) {
  return value.trim().slice(0, 500);
}

export default function LlmPage() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [input, setInput] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState(
    "Ready. Your PC, Ollama, bridge, and tunnel must be running."
  );
  const [loading, setLoading] = useState(false);
  const [lastSentAt, setLastSentAt] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedAccessKey = localStorage.getItem("dashboardAccessKey") || "";
    const savedModel = localStorage.getItem("localLlmModel") || DEFAULT_MODEL;
    const savedMessages = localStorage.getItem("localLlmMessages") || "";

    setAccessKey(savedAccessKey);
    setModel(savedModel);

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);

        if (Array.isArray(parsed)) {
          setMessages(
            parsed
              .filter(
                (message) =>
                  message &&
                  (message.role === "user" || message.role === "assistant") &&
                  typeof message.content === "string"
              )
              .slice(-40)
          );
        }
      } catch {
        localStorage.removeItem("localLlmMessages");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("localLlmMessages", JSON.stringify(messages.slice(-40)));
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const canSend = useMemo(() => {
    return input.trim().length > 0 && !loading;
  }, [input, loading]);

  function saveAccessKey(value: string) {
    const cleaned = cleanAccessKey(value);
    setAccessKey(cleaned);
    localStorage.setItem("dashboardAccessKey", cleaned);
  }

  function saveModel(value: string) {
    const cleaned = cleanModel(value);
    setModel(cleaned);
    localStorage.setItem("localLlmModel", cleaned);
  }

  function clearChat() {
    if (loading) {
      stopRequest();
    }

    setMessages([]);
    localStorage.removeItem("localLlmMessages");
    setStatus("Chat cleared.");
    setLastSentAt("");
  }

  function stopRequest() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setStatus("Stopped.");
  }

  async function send(customPrompt?: string) {
    const prompt = (customPrompt ?? input).trim();

    if (!prompt || loading) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setInput("");
    setLoading(true);
    setStatus("Sending to your PC model...");

    const nextMessages: Msg[] = [
      ...messages.slice(-30),
      {
        role: "user",
        content: prompt,
      },
    ];

    setMessages(nextMessages);

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(accessKey ? { "x-dashboard-key": accessKey } : {}),
        },
        body: JSON.stringify({
          model: cleanModel(model),
          messages: nextMessages,
        }),
      });

      const data = await readJsonOrText(response);

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "LLM failed. Check LOCAL_LLM_URL, LOCAL_LLM_TOKEN, PC bridge, tunnel, and Ollama."
        );
      }

      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply
          : "(empty reply)";

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: reply,
        },
      ]);

      setLastSentAt(nowTime());
      setStatus(`Connected to local ${data.model || cleanModel(model)}.`);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        setStatus("Stopped.");
      } else {
        setStatus(
          error?.message ||
            "LLM failed. Your PC, Ollama, bridge, or tunnel may be off."
        );
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function resendLastUserMessage() {
    const lastUser = [...messages].reverse().find((message) => message.role === "user");

    if (!lastUser) {
      setStatus("No previous user message to resend.");
      return;
    }

    send(lastUser.content);
  }

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">LOCAL LLM</p>
            <h1>Local LLM</h1>
            <p className="muted">
              Uses your PC model through Vercel. It works from your phone anywhere
              only while Ollama, the local bridge, and the tunnel are running on
              your PC.
            </p>
          </div>

          <div className="row">
            <button onClick={clearChat} disabled={messages.length === 0 && !loading}>
              clear chat
            </button>

            <button onClick={resendLastUserMessage} disabled={loading || messages.length === 0}>
              resend last
            </button>

            {loading && (
              <button className="danger" onClick={stopRequest}>
                stop
              </button>
            )}
          </div>
        </div>

        <div className="row">
          <input
            value={model}
            onChange={(event) => saveModel(event.target.value)}
            placeholder="Ollama model, e.g. llama3.1"
            aria-label="Ollama model"
          />

          <input
            value={accessKey}
            onChange={(event) => saveAccessKey(event.target.value)}
            placeholder="dashboard key, if DASHBOARD_ACCESS_KEY is set"
            aria-label="dashboard access key"
            type="password"
            autoComplete="off"
          />
        </div>

        <div className="panel">
          <p className="muted small">
            Status: {status}
            {lastSentAt ? ` · last reply ${lastSentAt}` : ""}
          </p>
        </div>
      </section>

      <section className="stack">
        {messages.length === 0 && (
          <div className="panel">
            <h2>No messages yet</h2>
            <p className="muted">
              Type a message below. Use Enter or Ctrl+Enter to send. Use
              Shift+Enter for a new line.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <article className="post stack" key={`${message.role}-${index}`}>
            <div className="spread">
              <div>
                <span className="badge">
                  {message.role === "user" ? "you" : "local llm"}
                </span>
              </div>

              <button
                onClick={() => navigator.clipboard.writeText(message.content)}
                title="Copy message"
              >
                copy
              </button>
            </div>

            <pre>{message.content}</pre>
          </article>
        ))}

        {loading && (
          <div className="post">
            <span className="badge">local llm</span>
            <p className="muted" style={{ marginTop: 10 }}>
              thinking...
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </section>

      <section className="panel stack">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="message..."
          aria-label="message"
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;

            if (event.shiftKey) {
              return;
            }

            if (event.ctrlKey || !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />

        <div className="row">
          <button onClick={() => send()} disabled={!canSend}>
            {loading ? "sending..." : "send"}
          </button>

          <button onClick={() => setInput("")} disabled={!input || loading}>
            clear input
          </button>

          <span className="muted small">
            Enter sends. Shift+Enter makes a new line.
          </span>
        </div>
      </section>

      <section className="panel stack">
        <h2>PC requirements</h2>

        <pre>{`Ollama running
local/llm-bridge.mjs running
Cloudflare tunnel running
Vercel env set:
LOCAL_LLM_URL
LOCAL_LLM_TOKEN
LOCAL_LLM_MODEL
optional: DASHBOARD_ACCESS_KEY`}</pre>
      </section>
    </div>
  );
}