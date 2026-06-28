"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "terminal-chatgpt-history";
const PASSWORD_KEY = "terminal-chatgpt-password";

export default function ChatGPTTerminalPage() {
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("ready");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      const savedPassword = localStorage.getItem(PASSWORD_KEY);

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      if (savedPassword) {
        setPassword(savedPassword);
      }
    } catch {
      // ignore bad localStorage data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-40)));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    localStorage.setItem(PASSWORD_KEY, password);
  }, [password]);

  function clearTerminal() {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    setStatus("cleared");
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();

    const text = input.trim();
    if (!text || busy) return;

    if (text === "/clear") {
      setInput("");
      clearTerminal();
      return;
    }

    if (text === "/help") {
      setInput("");
      setHistory((old) => [
        ...old,
        { role: "user", content: "/help" },
        {
          role: "assistant",
          content:
            "Commands:\n/clear = clear terminal\n/help = show commands\n\nType normally to chat.",
        },
      ]);
      return;
    }

    setInput("");
    setBusy(true);
    setStatus("thinking");

    const nextHistory: ChatMessage[] = [
      ...history,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ];

    setHistory(nextHistory);

    try {
      const res = await fetch("/api/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chat-password": password,
        },
        body: JSON.stringify({
          message: text,
          history: history.slice(-20),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Request failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        assistantText += decoder.decode(value, { stream: true });

        setHistory((current) => {
          const copy = [...current];
          const lastIndex = copy.length - 1;

          if (copy[lastIndex]?.role === "assistant") {
            copy[lastIndex] = {
              role: "assistant",
              content: assistantText,
            };
          }

          return copy;
        });
      }

      setStatus("ready");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred.";

      setHistory((current) => {
        const copy = [...current];
        const lastIndex = copy.length - 1;

        if (copy[lastIndex]?.role === "assistant") {
          copy[lastIndex] = {
            role: "assistant",
            content: `[error] ${message}`,
          };
        }

        return copy;
      });

      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="terminal-shell">
      <section className="terminal-window">
        <div className="terminal-topbar">
          <div>
            <span className="terminal-dot" />
            <span className="terminal-title">chatgpt://terminal</span>
          </div>

          <div className="terminal-status">{status}</div>
        </div>

        <div className="terminal-password-row">
          <span>password:</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="only needed if CHAT_TERMINAL_PASSWORD is set"
            className="terminal-password"
            type="password"
          />
        </div>

        <div className="terminal-output">
          <div className="terminal-line system">
            booting custom ChatGPT terminal...
          </div>
          <div className="terminal-line system">
            commands: /help /clear
          </div>

          {history.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === "user"
                  ? "terminal-message user"
                  : "terminal-message assistant"
              }
            >
              <div className="terminal-label">
                {msg.role === "user" ? "you" : "chatgpt"}
              </div>
              <pre>{msg.content || "..."}</pre>
            </div>
          ))}

          {busy && <div className="terminal-cursor">█</div>}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="terminal-input-row">
          <span className="terminal-prompt">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            autoFocus
            placeholder="type message..."
            className="terminal-input"
          />
          <button disabled={busy || !input.trim()} className="terminal-send">
            send
          </button>
        </form>
      </section>
    </main>
  );
}