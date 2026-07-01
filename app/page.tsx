"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

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

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
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

      console.log("API STATUS:", res.status);
      console.log("API DATA:", data);

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
          content:
            aiText && aiText.trim()
              ? aiText.trim()
              : "Empty response. Open Vercel logs and check GEMINI DATA.",
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
    <main style={styles.page}>
      <div style={styles.terminal}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>chatgpt://terminal</div>
            <div style={styles.subtitle}>Google AI / Vercel</div>
          </div>

          <button onClick={() => setMessages([])} style={styles.clearButton}>
            clear
          </button>
        </div>

        <div style={styles.output}>
          {messages.map((msg, index) => (
            <div key={index} style={styles.messageBlock}>
              <div style={msg.role === "user" ? styles.userLabel : styles.aiLabel}>
                {msg.role === "user" ? "you" : "ai"}
              </div>

              <pre style={styles.messageText}>{msg.content}</pre>
            </div>
          ))}

          {loading && (
            <div style={styles.messageBlock}>
              <div style={styles.aiLabel}>ai</div>
              <pre style={styles.messageText}>thinking...</pre>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} style={styles.form}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="type message..."
            style={styles.input}
            disabled={loading}
            autoFocus
          />

          <button type="submit" style={styles.sendButton} disabled={loading}>
            send
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#050505",
    color: "#e5e5e5",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  terminal: {
    width: "100%",
    maxWidth: 900,
    height: "90vh",
    border: "1px solid #333",
    borderRadius: 12,
    background: "#0b0b0b",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    padding: "14px 16px",
    borderBottom: "1px solid #222",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#111",
  },
  title: {
    color: "#7cff7c",
    fontSize: 15,
  },
  subtitle: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  clearButton: {
    background: "#191919",
    color: "#aaa",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
  },
  output: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
  },
  messageBlock: {
    marginBottom: 18,
  },
  userLabel: {
    color: "#70a7ff",
    fontSize: 13,
    marginBottom: 5,
  },
  aiLabel: {
    color: "#7cff7c",
    fontSize: 13,
    marginBottom: 5,
  },
  messageText: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.55,
  },
  form: {
    display: "flex",
    gap: 8,
    padding: 12,
    borderTop: "1px solid #222",
    background: "#111",
  },
  input: {
    flex: 1,
    background: "#050505",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: 8,
    padding: "12px 14px",
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
  },
  sendButton: {
    background: "#7cff7c",
    color: "#000",
    border: "none",
    borderRadius: 8,
    padding: "0 18px",
    fontFamily: "inherit",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
