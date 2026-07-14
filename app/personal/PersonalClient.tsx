"use client";

import { useMemo, useState } from "react";
import YouTubeClient from "@/app/youtube/YouTubeClient";
import ChanClient from "@/app/chan/ChanClient";
import TwitchArtifactClient from "./TwitchArtifactClient";

type PersonalTab = "youtube" | "twitch" | "chan";

export default function PersonalClient({ username, initialTab = "youtube" }: { username: string; initialTab?: PersonalTab }) {
  const [active, setActive] = useState<PersonalTab>(initialTab);
  const [visited, setVisited] = useState<Set<PersonalTab>>(() => new Set([initialTab]));
  const tabs = useMemo(() => ([
    { key: "youtube" as const, label: "YouTube", description: "Text-first search, direct video opening and permanent hidden-video controls." },
    { key: "twitch" as const, label: "Artifact Live", description: "Live Artifact-category channels, saved Twitch links, embedded player and chat." },
    { key: "chan" as const, label: "4chan", description: "The restored read-only board and thread viewport with permanent hides and board disabling." },
  ]), []);

  function openTab(tab: PersonalTab) {
    setActive(tab);
    setVisited((old) => new Set(old).add(tab));
    window.history.replaceState(null, "", `/personal?tab=${tab}`);
  }

  return (
    <div className="personal-page stack">
      <section className="personal-hero panel">
        <div>
          <p className="eyebrow">ADMIN ONLY</p>
          <h1>Personal tools</h1>
          <p className="muted">Private browsing tools are kept separate from the customer and business areas. Only the administrator can open this page or its APIs.</p>
        </div>
        <span className="badge">{username}</span>
      </section>

      <nav className="personal-tabs" aria-label="Personal tools">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={active === tab.key ? "active" : ""}
            type="button"
            onClick={() => openTab(tab.key)}
            aria-selected={active === tab.key}
          >
            <strong>{tab.label}</strong>
            <small>{tab.description}</small>
          </button>
        ))}
      </nav>

      <section hidden={active !== "youtube"} aria-hidden={active !== "youtube"}>
        {visited.has("youtube") && <YouTubeClient />}
      </section>
      <section hidden={active !== "twitch"} aria-hidden={active !== "twitch"}>
        {visited.has("twitch") && <TwitchArtifactClient />}
      </section>
      <section hidden={active !== "chan"} aria-hidden={active !== "chan"}>
        {visited.has("chan") && <ChanClient username={username} />}
      </section>
    </div>
  );
}
