"use client";

import { useEffect, useRef, useState } from "react";

type Attachment = {
  name: string;
  type: string;
  dataUrl: string;
  size: number;
};

type Message = {
  id: number;
  username: string;
  role: string;
  body: string;
  attachments: Attachment[];
  created_at: string;
};

type Presence = {
  username: string;
  role: string;
  online: boolean;
  last_seen: string;
};

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function clock(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function day(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString();
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function attachmentSize(bytes: number) {
  if (!Number.isFinite(bytes)) return "? MB";
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ChatClient({ username, role }: { username: string; role: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState("secure chat ready");
  const [loading, setLoading] = useState(false);
  const [stickToBottom, setStickToBottom] = useState(true);

  const chatWindowRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef(0);
  const firstLoadRef = useRef(true);

  function scrollToBottom(mode: ScrollBehavior = "smooth") {
    const box = chatWindowRef.current;

    if (!box) return;

    box.scrollTo({
      top: box.scrollHeight,
      behavior: mode,
    });
  }

  function onChatScroll() {
    const box = chatWindowRef.current;

    if (!box) return;

    const distanceFromBottom = box.scrollHeight - box.scrollTop - box.clientHeight;
    setStickToBottom(distanceFromBottom < 120);
  }

  async function load() {
    try {
      const response = await fetch("/api/chat/state", {
        cache: "no-store",
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "chat failed");
      }

      const nextMessages = Array.isArray(data.messages) ? data.messages : [];
      const nextPresence = Array.isArray(data.presence) ? data.presence : [];
      const nextLastId = nextMessages.length ? nextMessages[nextMessages.length - 1].id : 0;
      const hasNewMessage = nextLastId !== lastIdRef.current && lastIdRef.current !== 0;

      if (hasNewMessage) {
        setStatus(
          `▸ new terminal message @ ${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`
        );
      }

      lastIdRef.current = nextLastId;
      setMessages(nextMessages);
      setPresence(nextPresence);

      window.setTimeout(() => {
        if (firstLoadRef.current || stickToBottom) {
          scrollToBottom(firstLoadRef.current ? "auto" : "smooth");
          firstLoadRef.current = false;
        }
      }, 40);
    } catch (error) {
      setStatus(errorMessage(error, "chat failed"));
    }
  }

  async function send() {
    if ((!body.trim() && !files?.length) || loading) return;

    setLoading(true);
    setStatus("sending...");

    try {
      const form = new FormData();
      form.set("body", body);
      Array.from(files || []).forEach((file) => form.append("files", file));

      const response = await fetch("/api/chat/messages", {
        method: "POST",
        body: form,
      });

      const data = await readJson(response);

      if (!response.ok) {
        throw new Error(data.error || "send failed");
      }

      setBody("");
      setFiles(null);

      const input = document.getElementById("chat-files") as HTMLInputElement | null;
      if (input) input.value = "";

      setStickToBottom(true);
      await load();
      window.setTimeout(() => scrollToBottom("smooth"), 80);
      setStatus("sent");
    } catch (error) {
      setStatus(errorMessage(error, "send failed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickToBottom]);

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="spread">
          <div>
            <p className="badge">PRIVATE CHAT</p>
            <h1 className="terminal-title">Terminal chat</h1>
            <p className="muted">
              Signed in as {username}:{role}. Chat stays inside its own window so the
              page does not jump around.
            </p>
          </div>

          <div className="row">
            <button onClick={() => load()} disabled={loading}>
              sync
            </button>
            <button onClick={() => scrollToBottom("smooth")}>
              latest
            </button>
          </div>
        </div>

        <div className="presence-grid">
          {presence.map((person) => (
            <div className="presence-card" key={person.username}>
              <span className={`light ${person.online ? "online" : "offline"}`} />
              <div className="presence-main">
                <strong>{person.username}:{person.role}</strong>
                <span className="muted small">
                  {person.online ? "online" : `offline · ${clock(person.last_seen)}`}
                </span>
              </div>
            </div>
          ))}
        </div>

        <p className="muted small">Status: {status}</p>
      </section>

      <div className="chat-shell">
        <section className="panel stack">
          <div className="spread">
            <div>
              <h2>Messages</h2>
              <p className="muted small">
                {messages.length} loaded · {stickToBottom ? "following latest" : "paused while reading old messages"}
              </p>
            </div>

            {!stickToBottom && (
              <button onClick={() => {
                setStickToBottom(true);
                scrollToBottom("smooth");
              }}>
                jump to latest
              </button>
            )}
          </div>

          <div className="chat-window stack" ref={chatWindowRef} onScroll={onChatScroll}>
            {messages.length === 0 && (
              <div className="panel">
                <p className="muted">No chat messages yet.</p>
              </div>
            )}

            {messages.map((message) => {
              const mine = message.username === username;

              return (
                <article
                  className={`post stack chatline ${mine ? "message-me" : "message-them"}`}
                  key={message.id}
                >
                  <div className="spread">
                    <div>
                      <span className="badge">{message.username}:{message.role}</span>{" "}
                      <span className="muted small">
                        {day(message.created_at)} · {clock(message.created_at)}
                      </span>
                    </div>

                    {mine && <span className="badge">you</span>}
                  </div>

                  {message.body && <pre>{message.body}</pre>}

                  {message.attachments?.length > 0 && (
                    <div className="grid">
                      {message.attachments.map((attachment, index) => (
                        <div className="panel stack" key={`${attachment.name}-${index}`}>
                          <p className="muted small">
                            {attachment.name} · {attachmentSize(attachment.size)}
                          </p>

                          {attachment.type.startsWith("image/") ? (
                            <img className="media" src={attachment.dataUrl} alt={attachment.name} loading="lazy" />
                          ) : (
                            <video className="media" src={attachment.dataUrl} controls />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel stack chat-compose">
          <h2>Send</h2>

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="terminal message..."
          />

          <input
            id="chat-files"
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(event) => setFiles(event.target.files)}
          />

          {files && files.length > 0 && (
            <div className="stack">
              {Array.from(files).map((file) => (
                <span className="badge" key={`${file.name}-${file.size}`}>
                  {file.name} · {attachmentSize(file.size)}
                </span>
              ))}
            </div>
          )}

          <div className="row">
            <button onClick={send} disabled={loading || (!body.trim() && !files?.length)}>
              {loading ? "sending..." : "send"}
            </button>

            <button
              onClick={() => {
                setBody("");
                setFiles(null);
                const input = document.getElementById("chat-files") as HTMLInputElement | null;
                if (input) input.value = "";
              }}
              disabled={loading || (!body && !files?.length)}
            >
              clear
            </button>
          </div>

          <p className="muted small">
            Enter sends. Shift+Enter newline. For disappearing chat, set CHAT_TTL_HOURS
            in Vercel and the server will trim old messages.
          </p>
        </section>
      </div>
    </div>
  );
}
