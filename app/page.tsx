"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "booting custom Google AI terminal...\ncommands: /clear",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();

    const text = input.trim();
    if (!text || loading) return;

    if (text === "/clear") {
      setMessages([]);
      setInput("");
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: messages,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "API error");
      }

      const aiText =
        data?.reply ||
        data?.response ||
        data?.text ||
        data?.output_text ||
        "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiText?.trim() || "Empty response. Check Vercel logs.",
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `[error] ${err?.message || "Something went wrong"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      {/* Navigation */}
      <nav style={{ marginBottom: 20 }}>
        <Link href="/" className="action-button">Home</Link>
        <Link href="/viewer/dreamviews" className="action-button">Dreamviews</Link>
        <Link href="/viewer/rule34" className="action-button">Rule34</Link>
        <Link href="/stream" className="action-button">Streaming</Link>
      </nav>

      {/* Terminal */}
      <div className="chatgpt-terminal-card">
        <div className="chatgpt-terminal-top">
          <div>
            <span className="chatgpt-terminal-dot"></span>
            chatgpt://terminal
          </div>
          <button
            className="action-button chatgpt-terminal-send"
            onClick={() => setMessages([])}
          >
            clear
          </button>
        </div>

        <div className="chatgpt-terminal-output">
          <div className="chatgpt-terminal-system">
            booting custom ChatGPT terminal...
          </div>
          <div className="chatgpt-terminal-system">
            commands: /clear
          </div>

          {messages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === "user"
                  ? "chatgpt-terminal-message chatgpt-user"
                  : "chatgpt-terminal-message chatgpt-assistant"
              }
            >
              <div className="chatgpt-terminal-label">
                {msg.role === "user" ? "you" : "ai"}
              </div>
              <pre>{msg.content}</pre>
            </div>
          ))}

          {loading && (
            <div className="chatgpt-terminal-message chatgpt-assistant">
              <div className="chatgpt-terminal-label">ai</div>
              <pre>thinking...</pre>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form className="chatgpt-terminal-input-row" onSubmit={sendMessage}>
          <span className="chatgpt-terminal-prompt">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            autoFocus
            placeholder="type message..."
            className="chatgpt-terminal-input"
          />
          <button
            disabled={loading || !input.trim()}
            className="action-button chatgpt-terminal-send"
          >
            send
          </button>
        </form>
      </div>
    </div>
  );
}
