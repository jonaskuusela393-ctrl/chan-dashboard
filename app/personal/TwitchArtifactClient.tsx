"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseStreamSource, streamPlayerUrl, streamPublicUrl, type StreamSource } from "@/lib/streamSources";
import { CompactStatus, IconAction, IconLink } from "./IconAction";

type LiveStream = { id:string; channel:string; displayName:string; title:string; viewers:number; startedAt:string; language:string; thumbnailUrl:string; tags:string[]; mature:boolean };
type ApiResult = { ok?:boolean; configured?:boolean; streams?:LiveStream[]; message?:string; fetchedAt?:string; error?:string };
type StreamListResult = { ok?:boolean; sources?:StreamSource[]; skipped?:number; error?:string };
type SavedChannel = { channel:string; label:string; addedAt:string };

const CHANNEL_STORAGE_KEY = "raccoon-personal-twitch-channels-v1";
const SOURCE_STORAGE_KEY = "raccoon-personal-stream-sources-v1";

function parseChannel(value:string){const raw=value.trim();if(!raw)return"";try{const p=/^https?:\/\//i.test(raw)?raw:raw.includes("twitch.tv/")?`https://${raw}`:"";if(p){const u=new URL(p);if(!/(^|\.)twitch\.tv$/i.test(u.hostname))return"";const c=u.pathname.split("/").filter(Boolean)[0]||"";return/^[a-z0-9_]{2,25}$/i.test(c)?c.toLowerCase():""}}catch{}const c=raw.replace(/^@/,"");return/^[a-z0-9_]{2,25}$/i.test(c)?c.toLowerCase():""}
function readChannels():SavedChannel[]{try{const v=JSON.parse(localStorage.getItem(CHANNEL_STORAGE_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x.channel==="string").slice(0,100):[]}catch{return[]}}
function readSources():StreamSource[]{try{const v=JSON.parse(localStorage.getItem(SOURCE_STORAGE_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x.id==="string"&&typeof x.value==="string").map(x=>({...x,origin:"manual" as const})).slice(0,100):[]}catch{return[]}}

export default function TwitchArtifactClient(){
 const shellRef=useRef<HTMLDivElement|null>(null);
 const [data,setData]=useState<ApiResult>({});const [loading,setLoading]=useState(true);const [status,setStatus]=useState("…");
 const [saved,setSaved]=useState<SavedChannel[]>([]);const [entry,setEntry]=useState("");const [activeChannel,setActiveChannel]=useState("");const [showChat,setShowChat]=useState(false);const [parentHost,setParentHost]=useState("localhost");
 const [savedSources,setSavedSources]=useState<StreamSource[]>([]);const [gistSources,setGistSources]=useState<StreamSource[]>([]);const [sourceEntry,setSourceEntry]=useState("");const [activeSourceId,setActiveSourceId]=useState("");const [sourceLoading,setSourceLoading]=useState(false);const [nonce,setNonce]=useState(0);const [help,setHelp]=useState(false);const [diagnostics,setDiagnostics]=useState(false);

 useEffect(()=>{setSaved(readChannels());setSavedSources(readSources());setParentHost(window.location.hostname||"localhost")},[]);
 const refresh=useCallback(async()=>{setLoading(true);setStatus("…");try{const r=await fetch("/api/twitch/artifact",{cache:"no-store"});const p=await r.json().catch(()=>({})) as ApiResult;setData(p);if(!r.ok||!p.ok)throw new Error(p.error||"Twitch failed");setStatus(String(p.streams?.length||0))}catch(e){setStatus(e instanceof Error?e.message:"error")}finally{setLoading(false)}},[]);
 const refreshSources=useCallback(async()=>{setSourceLoading(true);try{const r=await fetch("/api/twitch/stream-list",{cache:"no-store"});const p=await r.json().catch(()=>({})) as StreamListResult;if(!r.ok||!p.ok)throw new Error(p.error||"list failed");setGistSources(Array.isArray(p.sources)?p.sources:[]);setStatus(String(p.sources?.length||0))}catch(e){setGistSources([]);setStatus(e instanceof Error?e.message:"error")}finally{setSourceLoading(false)}},[]);
 useEffect(()=>{void refresh();void refreshSources();const timer=window.setInterval(()=>void refresh(),120000);return()=>window.clearInterval(timer)},[refresh,refreshSources]);
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==="F12")return;const t=e.target as HTMLElement|null;if(t?.matches("input,textarea,select,button,[contenteditable='true']"))return;if(e.key.toLowerCase()==="f"&&(activeChannel||activeSourceId)){e.preventDefault();if(document.fullscreenElement)void document.exitFullscreen();else void shellRef.current?.requestFullscreen()}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[activeChannel,activeSourceId]);

 function persistChannels(next:SavedChannel[]){setSaved(next);localStorage.setItem(CHANNEL_STORAGE_KEY,JSON.stringify(next))}
 function persistSources(next:StreamSource[]){const n=next.map(s=>({...s,origin:"manual" as const})).slice(0,100);setSavedSources(n);localStorage.setItem(SOURCE_STORAGE_KEY,JSON.stringify(n))}
 function watch(channel:string){setActiveChannel(channel);setActiveSourceId("");setNonce(n=>n+1)}
 function addChannel(){const c=parseChannel(entry);if(!c){setStatus("bad channel");return}persistChannels([{channel:c,label:c,addedAt:new Date().toISOString()},...saved.filter(x=>x.channel!==c)].slice(0,100));setEntry("");watch(c);setStatus("1")}
 function addSource(){const s=parseStreamSource(sourceEntry,{origin:"manual",allowCustomEmbed:true});if(!s){setStatus("bad source");return}persistSources([s,...savedSources.filter(x=>x.id!==s.id)]);setSourceEntry("");setActiveSourceId(s.id);setNonce(n=>n+1);setStatus("1")}
 const allSources=useMemo(()=>{const m=new Map<string,StreamSource>();for(const s of savedSources)m.set(s.id,s);for(const s of gistSources)if(!m.has(s.id))m.set(s.id,s);return[...m.values()]},[savedSources,gistSources]);
 const selectedSource=useMemo(()=>allSources.find(s=>s.id===activeSourceId)||null,[activeSourceId,allSources]);
 const nativeUrl=activeChannel?`https://player.twitch.tv/?channel=${encodeURIComponent(activeChannel)}&parent=${encodeURIComponent(parentHost)}&autoplay=false`:"";
 const playerUrl=selectedSource?streamPlayerUrl(selectedSource,parentHost):nativeUrl;
 const chatUrl=activeChannel?`https://www.twitch.tv/embed/${encodeURIComponent(activeChannel)}/chat?parent=${encodeURIComponent(parentHost)}&darkpopout`:"";
 const sandbox=selectedSource?.provider==="embed"?"allow-scripts allow-forms allow-popups allow-presentation":undefined;

 return <div className="personal-tool twitch-artifact stack">
  <section className="panel personal-toolbar stack">
   <div className="row personal-icon-row">
    <input value={entry} onChange={e=>setEntry(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addChannel()}} placeholder="channel" aria-label="Twitch channel" />
    <IconAction label="Save and watch Twitch channel" onClick={addChannel}>→</IconAction>
    <IconAction label="Refresh Artifact category" onClick={()=>void refresh()} disabled={loading}>↻</IconAction>
    <IconAction label="Show or hide Twitch chat" onClick={()=>setShowChat(v=>!v)} disabled={!activeChannel}>{showChat?"◒":"◐"}</IconAction>
    <IconAction label="Reload video" onClick={()=>setNonce(n=>n+1)} disabled={!playerUrl}>⟳</IconAction>
    <IconAction label="Fullscreen" onClick={()=>void shellRef.current?.requestFullscreen()} disabled={!playerUrl}>□</IconAction>
    <IconAction label="Show diagnostics" onClick={()=>setDiagnostics(v=>!v)}>i</IconAction>
    <IconAction label="Show symbol help" onClick={()=>setHelp(v=>!v)}>?</IconAction>
    <CompactStatus busy={loading}>{status}</CompactStatus>
   </div>
   <div className="row personal-icon-row">
    <input value={sourceEntry} onChange={e=>setSourceEntry(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addSource()}} placeholder="stream / URL" aria-label="Replacement stream source" />
    <IconAction label="Save replacement source" onClick={addSource}>+</IconAction>
    <IconAction label="Use original Twitch video" onClick={()=>{setActiveSourceId("");setNonce(n=>n+1)}} disabled={!activeChannel}>◉</IconAction>
    <IconAction label="Reload safe source list" onClick={()=>void refreshSources()} disabled={sourceLoading}>↻</IconAction>
   </div>
   {help&&<div className="personal-legend">→ watch · ↻ refresh · ◐ chat · ⟳ reload · □ fullscreen · + source · ◉ original · ↗ external · ☆ save · × remove · F fullscreen</div>}
   {!data.configured&&<div className="personal-legend">TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET</div>}
  </section>

  <section className="personal-stream-strip">
   {(data.streams||[]).map(stream=><article className="twitch-stream-card compact" key={stream.id}>
    <button className="twitch-thumbnail" type="button" onClick={()=>watch(stream.channel)} aria-label={`Watch ${stream.displayName}`} title={`Watch ${stream.displayName}`}><img src={stream.thumbnailUrl} alt="" loading="lazy"/><span className="twitch-live">●</span><span className="twitch-viewers">{stream.viewers.toLocaleString()}</span></button>
    <div className="stack compact-stack"><div className="spread"><strong>{stream.displayName}</strong><div className="row"><IconAction label="Watch here" onClick={()=>watch(stream.channel)}>▶</IconAction><IconLink label="Open Twitch" href={`https://www.twitch.tv/${stream.channel}`} target="_blank" rel="noreferrer">↗</IconLink></div></div><p className="twitch-title">{stream.title}</p></div>
   </article>)}
  </section>

  {(saved.length>0||allSources.length>0)&&<section className="panel stack compact-library">
   {saved.map(item=><div className="saved-channel-row compact" key={item.channel}><strong>{item.label}</strong><div className="row"><IconAction label="Watch saved channel" onClick={()=>watch(item.channel)}>▶</IconAction><IconLink label="Open Twitch" href={`https://www.twitch.tv/${item.channel}`} target="_blank" rel="noreferrer">↗</IconLink><IconAction className="danger" label="Remove saved channel" onClick={()=>persistChannels(saved.filter(x=>x.channel!==item.channel))}>×</IconAction></div></div>)}
   {allSources.map(source=>{const savedSource=savedSources.some(x=>x.id===source.id);return <div className={`saved-channel-row compact ${activeSourceId===source.id?"active":""}`} key={source.id}><strong>{source.label}</strong><div className="row"><IconAction label="Use this video" onClick={()=>{setActiveSourceId(source.id);setNonce(n=>n+1)}}>▶</IconAction>{source.provider==="twitch"&&<IconAction label="Use this Twitch channel and chat" onClick={()=>{setActiveChannel(source.value);setShowChat(true)}}>◐</IconAction>}<IconLink label="Open source" href={streamPublicUrl(source)} target="_blank" rel="noreferrer">↗</IconLink>{savedSource?<IconAction className="danger" label="Remove saved source" onClick={()=>{persistSources(savedSources.filter(x=>x.id!==source.id));if(activeSourceId===source.id)setActiveSourceId("")}}>×</IconAction>:<IconAction label="Save source" onClick={()=>persistSources([source,...savedSources.filter(x=>x.id!==source.id)])}>☆</IconAction>}</div></div>})}
  </section>}

  <section className="panel twitch-player-panel stack">
   {playerUrl?<div ref={shellRef} className={`twitch-embed-shell ${showChat&&activeChannel?"with-chat":""}`}><iframe key={`${playerUrl}-${nonce}`} className="twitch-player-frame" src={playerUrl} title="stream" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen sandbox={sandbox} referrerPolicy="strict-origin-when-cross-origin"/>{showChat&&activeChannel&&<iframe className="twitch-chat-frame" src={chatUrl} title="chat"/>}</div>:<div className="personal-empty">·</div>}
   {diagnostics&&<pre className="twitch-diagnostics">{JSON.stringify({activeChannel,activeSource:selectedSource,parentHost,playerUrl,chat:showChat,configured:data.configured},null,2)}</pre>}
  </section>
 </div>
}
