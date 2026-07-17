"use client";

import { useState } from "react";
import YouTubeClient from "@/app/youtube/YouTubeClient";
import ChanClient from "@/app/chan/ChanClient";
import TwitchArtifactClient from "./TwitchArtifactClient";
import RedditTerminalClient from "./RedditTerminalClient";

type PersonalTab = "youtube" | "twitch" | "chan" | "reddit";

const TABS: Array<{ key: PersonalTab; icon: string; label: string }> = [
  { key: "youtube", icon: "▶", label: "YouTube" },
  { key: "twitch", icon: "◉", label: "Twitch" },
  { key: "chan", icon: "▦", label: "4chan" },
  { key: "reddit", icon: "⌘", label: "Reddit" },
];

export default function PersonalClient({ username, initialTab = "youtube" }: { username: string; initialTab?: PersonalTab }) {
  const [active, setActive] = useState<PersonalTab>(initialTab);
  const [visited, setVisited] = useState<Set<PersonalTab>>(() => new Set([initialTab]));

  function openTab(tab: PersonalTab) {
    setActive(tab);
    setVisited((old) => new Set(old).add(tab));
    window.history.replaceState(null, "", `/personal?tab=${tab}`);
  }

  return (
    <div className="personal-page personal-lowtext stack">
      <nav className="personal-tabs personal-icon-tabs" aria-label="Personal tools">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={active === tab.key ? "active" : ""}
            type="button"
            onClick={() => openTab(tab.key)}
            aria-selected={active === tab.key}
            aria-label={tab.label}
            title={tab.label}
          >
            <span aria-hidden="true">{tab.icon}</span>
          </button>
        ))}
        <span className="personal-user" title="Administrator">{username}</span>
      </nav>

      <section hidden={active !== "youtube"} aria-hidden={active !== "youtube"}>{visited.has("youtube") && <YouTubeClient />}</section>
      <section hidden={active !== "twitch"} aria-hidden={active !== "twitch"}>{visited.has("twitch") && <TwitchArtifactClient />}</section>
      <section hidden={active !== "chan"} aria-hidden={active !== "chan"}>{visited.has("chan") && <ChanClient username={username} />}</section>
      <section hidden={active !== "reddit"} aria-hidden={active !== "reddit"}>{visited.has("reddit") && <RedditTerminalClient />}</section>
    </div>
  );
}
