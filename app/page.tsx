"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const HISTORY_KEY = "chan-dashboard-chatgpt-history";

export default function ChatGPTTerminalPage() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("READY");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch {
      // ignore broken saved data
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40)));
    } catch {
      // ignore storage errors
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  function clearTerminal() {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    setStatus("CLEARED");
  }

  async function submitMessage(e: FormEvent) {
    e.preventDefault();

    const text = input.trim();

    if (!text || busy) return;

    if (text.toLowerCase() === "/clear") {
      setInput("");
      clearTerminal();
      return;
    }

    if (text.toLowerCase() === "/help") {
      setInput("");
      setHistory((old) => [
        ...old,
        { role: "user", content: "/help" },
        {
          role: "assistant",
          content:
            "Commands:\n/clear = clear chat history\n/help = show this help\n\nType normally to talk with ChatGPT.",
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    const emptyAssistant: ChatMessage = {
      role: "assistant",
      content: "",
    };

    setInput("");
    setBusy(true);
    setStatus("THINKING");

    setHistory((old) => [...old, userMessage, emptyAssistant]);

    try {
      const res = await fetch("/api/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: history.slice(-18),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Request failed.");
      }

      const textResponse = await res.text();

      setHistory((current) => {
        const copy = [...current];
        const lastIndex = copy.length - 1;

        if (copy[lastIndex]?.role === "assistant") {
          copy[lastIndex] = {
            role: "assistant",
            content: textResponse || "[empty response]",
          };
        }

        return copy;
      });

      setStatus("READY");
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "Unknown terminal error.";

      setHistory((current) => {
        const copy = [...current];
        const lastIndex = copy.length - 1;

        if (copy[lastIndex]?.role === "assistant") {
          copy[lastIndex] = {
            role: "assistant",
            content: `[error] ${errorText}`,
          };
        }

        return copy;
      });

      setStatus("ERROR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <div className="chatgpt-terminal-header">
        <div>
          <h1>ChatGPT Terminal</h1>
          <div className="meta">custom dashboard module</div>
        </div>

        <Link href="/" className="action-button">
          back
        </Link>
      </div>

      <section className="chatgpt-terminal-card">
        <div className="chatgpt-terminal-top">
          <div>
            <span className="chatgpt-terminal-dot" />
            <span>chatgpt://terminal</span>
          </div>

          <span>{status}</span>
        </div>

        <div className="chatgpt-terminal-output">
          <div className="chatgpt-terminal-system">
            boot complete. type /help for commands.
          </div>

          {history.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === "user"
                  ? "chatgpt-terminal-message chatgpt-user"
                  : "chatgpt-terminal-message chatgpt-assistant"
              }
            >
              <div className="chatgpt-terminal-label">
                {msg.role === "user" ? "YOU" : "CHATGPT"}
              </div>

              <pre>{msg.content || "..."}</pre>
            </div>
          ))}

          {busy && <div className="chatgpt-terminal-blink">█</div>}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={submitMessage} className="chatgpt-terminal-input-row">
          <span className="chatgpt-terminal-prompt">&gt;</span>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            className="chatgpt-terminal-input"
            placeholder="message..."
            autoFocus
          />

          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="action-button chatgpt-terminal-send"
          >
            send
          </button>
        </form>
      </section>
    </main>
  );
}
