"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { parseStreamSource, streamPlayerUrl, streamPublicUrl, type StreamSource } from "@/lib/streamSources";
import { CompactStatus, IconAction, IconLink } from "./IconAction";

type LiveStream = { id:string; channel:string; displayName:string; title:string; viewers:number; startedAt:string; language:string; thumbnailUrl:string; tags:string[]; mature:boolean };
type ApiResult = { ok?:boolean; configured?:boolean; streams?:LiveStream[]; message?:string; fetchedAt?:string; error?:string };
type StreamListResult = { ok?:boolean; sources?:StreamSource[]; skipped?:number; error?:string };
type SavedChannel = { channel:string; label:string; addedAt:string };
type MaskLayout = { x:number; y:number; w:number; h:number };
type MaskGesture = { mode:"move"|"resize"; pointerId:number; startX:number; startY:number; layout:MaskLayout; width:number; height:number };

const CHANNEL_STORAGE_KEY = "raccoon-personal-twitch-channels-v1";
const SOURCE_STORAGE_KEY = "raccoon-personal-stream-sources-v1";
const MASK_STORAGE_KEY = "raccoon-personal-twitch-mask-v1";
const DEFAULT_MASK: MaskLayout = { x:4, y:5, w:42, h:15 };
const MIN_MASK_W = 0.5;
const MIN_MASK_H = 0.5;

function clamp(value:number,min:number,max:number){return Math.min(max,Math.max(min,value))}
function finite(value:unknown,fallback:number){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback}
function normalizeMask(value:Partial<MaskLayout>|null|undefined):MaskLayout{
 const w=clamp(finite(value?.w,DEFAULT_MASK.w),MIN_MASK_W,100);const h=clamp(finite(value?.h,DEFAULT_MASK.h),MIN_MASK_H,100);
 return{x:clamp(finite(value?.x,DEFAULT_MASK.x),0,100-w),y:clamp(finite(value?.y,DEFAULT_MASK.y),0,100-h),w,h};
}
function parseChannel(value:string){const raw=value.trim();if(!raw)return"";try{const p=/^https?:\/\//i.test(raw)?raw:raw.includes("twitch.tv/")?`https://${raw}`:"";if(p){const u=new URL(p);if(!/(^|\.)twitch\.tv$/i.test(u.hostname))return"";const c=u.pathname.split("/").filter(Boolean)[0]||"";return/^[a-z0-9_]{2,25}$/i.test(c)?c.toLowerCase():""}}catch{}const c=raw.replace(/^@/,"");return/^[a-z0-9_]{2,25}$/i.test(c)?c.toLowerCase():""}
function readChannels():SavedChannel[]{try{const v=JSON.parse(localStorage.getItem(CHANNEL_STORAGE_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x.channel==="string").slice(0,100):[]}catch{return[]}}
function readSources():StreamSource[]{try{const v=JSON.parse(localStorage.getItem(SOURCE_STORAGE_KEY)||"[]");return Array.isArray(v)?v.filter(x=>x&&typeof x.id==="string"&&typeof x.value==="string").map(x=>({...x,origin:"manual" as const})).slice(0,100):[]}catch{return[]}}
function readMask(){try{return normalizeMask(JSON.parse(localStorage.getItem(MASK_STORAGE_KEY)||"null"))}catch{return DEFAULT_MASK}}

export default function TwitchArtifactClient(){
 const shellRef=useRef<HTMLDivElement|null>(null);const videoStageRef=useRef<HTMLDivElement|null>(null);const maskGesture=useRef<MaskGesture|null>(null);
 const [data,setData]=useState<ApiResult>({});const [loading,setLoading]=useState(true);const [status,setStatus]=useState("…");
 const [saved,setSaved]=useState<SavedChannel[]>([]);const [entry,setEntry]=useState("");const [activeChannel,setActiveChannel]=useState("");const [showChat,setShowChat]=useState(false);const [parentHost,setParentHost]=useState("localhost");
 const [savedSources,setSavedSources]=useState<StreamSource[]>([]);const [gistSources,setGistSources]=useState<StreamSource[]>([]);const [sourceEntry,setSourceEntry]=useState("");const [activeSourceId,setActiveSourceId]=useState("");const [sourceLoading,setSourceLoading]=useState(false);const [nonce,setNonce]=useState(0);const [help,setHelp]=useState(false);const [diagnostics,setDiagnostics]=useState(false);
 const [maskEnabled,setMaskEnabled]=useState(true);const [mask,setMask]=useState<MaskLayout>(DEFAULT_MASK);const [theaterMode,setTheaterMode]=useState(false);const [fullscreenActive,setFullscreenActive]=useState(false);

 useEffect(()=>{setSaved(readChannels());setSavedSources(readSources());setMask(readMask());setMaskEnabled(true);setParentHost(window.location.hostname||"localhost")},[]);
 useEffect(()=>{try{localStorage.setItem(MASK_STORAGE_KEY,JSON.stringify(mask))}catch{}},[mask]);
 useEffect(()=>{const h=()=>setFullscreenActive(document.fullscreenElement===videoStageRef.current);document.addEventListener("fullscreenchange",h);return()=>document.removeEventListener("fullscreenchange",h)},[]);
 const refresh=useCallback(async()=>{setLoading(true);setStatus("…");try{const r=await fetch("/api/twitch/artifact",{cache:"no-store"});const p=await r.json().catch(()=>({})) as ApiResult;setData(p);if(!r.ok||!p.ok)throw new Error(p.error||"Twitch failed");setStatus(String(p.streams?.length||0))}catch(e){setStatus(e instanceof Error?e.message:"error")}finally{setLoading(false)}},[]);
 const refreshSources=useCallback(async()=>{setSourceLoading(true);try{const r=await fetch("/api/twitch/stream-list",{cache:"no-store"});const p=await r.json().catch(()=>({})) as StreamListResult;if(!r.ok||!p.ok)throw new Error(p.error||"list failed");setGistSources(Array.isArray(p.sources)?p.sources:[]);setStatus(String(p.sources?.length||0))}catch(e){setGistSources([]);setStatus(e instanceof Error?e.message:"error")}finally{setSourceLoading(false)}},[]);
 useEffect(()=>{void refresh();void refreshSources();const timer=window.setInterval(()=>void refresh(),120000);return()=>window.clearInterval(timer)},[refresh,refreshSources]);
 useEffect(()=>{const h=(e:KeyboardEvent)=>{if(e.key==="F12")return;const t=e.target as HTMLElement|null;if(t?.matches("input,textarea,select,button,[contenteditable='true'],[data-mask-control='true']"))return;if(e.key.toLowerCase()==="f"&&(activeChannel||activeSourceId)){e.preventDefault();void toggleFullscreen()}if(e.key.toLowerCase()==="b"&&(activeChannel||activeSourceId)){e.preventDefault();setMaskEnabled(v=>!v)}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[activeChannel,activeSourceId]);

 function persistChannels(next:SavedChannel[]){setSaved(next);localStorage.setItem(CHANNEL_STORAGE_KEY,JSON.stringify(next))}
 function persistSources(next:StreamSource[]){const n=next.map(s=>({...s,origin:"manual" as const})).slice(0,100);setSavedSources(n);localStorage.setItem(SOURCE_STORAGE_KEY,JSON.stringify(n))}
 function watch(channel:string){setActiveChannel(channel);setActiveSourceId("");setNonce(n=>n+1)}
 function addChannel(){const c=parseChannel(entry);if(!c){setStatus("bad channel");return}persistChannels([{channel:c,label:c,addedAt:new Date().toISOString()},...saved.filter(x=>x.channel!==c)].slice(0,100));setEntry("");watch(c);setStatus("1")}
 function addSource(){const s=parseStreamSource(sourceEntry,{origin:"manual",allowCustomEmbed:true});if(!s){setStatus("bad source");return}persistSources([s,...savedSources.filter(x=>x.id!==s.id)]);setSourceEntry("");setActiveSourceId(s.id);setNonce(n=>n+1);setStatus("1")}
 function beginMask(event:ReactPointerEvent<HTMLElement>,mode:"move"|"resize"){
  const stage=videoStageRef.current;if(!stage)return;event.preventDefault();event.stopPropagation();
  const rect=stage.getBoundingClientRect();maskGesture.current={mode,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,layout:mask,width:rect.width,height:rect.height};
  event.currentTarget.setPointerCapture?.(event.pointerId);
 }
 function moveMask(event:ReactPointerEvent<HTMLElement>){const gesture=maskGesture.current;if(!gesture||gesture.pointerId!==event.pointerId)return;event.preventDefault();
  const dx=(event.clientX-gesture.startX)/Math.max(1,gesture.width)*100;const dy=(event.clientY-gesture.startY)/Math.max(1,gesture.height)*100;
  if(gesture.mode==="move")setMask(normalizeMask({...gesture.layout,x:gesture.layout.x+dx,y:gesture.layout.y+dy}));
  else setMask(normalizeMask({...gesture.layout,w:gesture.layout.w+dx,h:gesture.layout.h+dy}));
 }
 function endMask(event:ReactPointerEvent<HTMLElement>){if(maskGesture.current?.pointerId===event.pointerId)maskGesture.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId)}
 function maskKeyboard(event:ReactKeyboardEvent<HTMLDivElement>){
  const step=event.altKey?5:1;let next={...mask};
  if(event.key==="ArrowLeft"){event.preventDefault();event.shiftKey?next.w-=step:next.x-=step}
  else if(event.key==="ArrowRight"){event.preventDefault();event.shiftKey?next.w+=step:next.x+=step}
  else if(event.key==="ArrowUp"){event.preventDefault();event.shiftKey?next.h-=step:next.y-=step}
  else if(event.key==="ArrowDown"){event.preventDefault();event.shiftKey?next.h+=step:next.y+=step}
  else if(event.key==="Home"){event.preventDefault();next={...DEFAULT_MASK}}
  else return;
  setMask(normalizeMask(next));
 }
 function resizeMask(scale:number){
  setMask(current=>normalizeMask({...current,w:current.w*scale,h:current.h*scale}));
  setMaskEnabled(true);
 }
 function tinyMask(){setMask(current=>normalizeMask({...current,w:MIN_MASK_W,h:MIN_MASK_H}));setMaskEnabled(true)}
 async function toggleFullscreen(){
  if(theaterMode){setTheaterMode(false);return}
  if(document.fullscreenElement){await document.exitFullscreen();return}
  const target=videoStageRef.current||shellRef.current;
  if(target?.requestFullscreen){
   try{await target.requestFullscreen();return}catch{}
  }
  setTheaterMode(true);
 }
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
    <IconAction label="Turn blackout mask on or off" className={maskEnabled?"active":""} onClick={()=>setMaskEnabled(v=>!v)} disabled={!playerUrl}>{maskEnabled?"■":"□"}</IconAction>
    <IconAction label="Make blackout mask tiny" onClick={tinyMask} disabled={!playerUrl}>·</IconAction>
    <IconAction label="Make blackout mask smaller" onClick={()=>resizeMask(.72)} disabled={!playerUrl}>−</IconAction>
    <IconAction label="Make blackout mask larger" onClick={()=>resizeMask(1.38)} disabled={!playerUrl}>+</IconAction>
    <IconAction label="Reset blackout mask" onClick={()=>{setMask(DEFAULT_MASK);setMaskEnabled(true)}} disabled={!playerUrl}>⌂</IconAction>
    <IconAction label="Fullscreen video with blackout mask" onClick={()=>void toggleFullscreen()} disabled={!playerUrl}>⛶</IconAction>
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
   {help&&<div className="personal-legend">■ mask · drag move · invisible lower-right resize · · tiny · −/+ size · arrows move · shift+arrows resize · B mask · F fullscreen</div>}
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
   {playerUrl?<div ref={shellRef} className={`twitch-embed-shell ${showChat&&activeChannel?"with-chat":""}`}>
    <div ref={videoStageRef} className={`twitch-video-stage ${theaterMode?"theater-mode":""}`}>
     <iframe key={`${playerUrl}-${nonce}`} className="twitch-player-frame" src={playerUrl} title="stream" allow="autoplay; picture-in-picture" allowFullScreen={false} sandbox={sandbox} referrerPolicy="strict-origin-when-cross-origin"/>
     {(fullscreenActive||theaterMode)&&<button type="button" className="twitch-theater-exit" aria-label="Exit fullscreen" title="Exit fullscreen" onClick={()=>void toggleFullscreen()}>×</button>}
     {maskEnabled&&<div
      className="twitch-blackout-mask"
      data-mask-control="true"
      role="application"
      tabIndex={0}
      aria-label="Movable blackout mask. Drag to move. Use the corner to resize. Arrow keys move it and Shift plus arrow keys resize it."
      title="Drag · corner resize · arrows move · Shift+arrows resize"
      style={{left:`${mask.x}%`,top:`${mask.y}%`,width:`${mask.w}%`,height:`${mask.h}%`}}
      onPointerDown={event=>beginMask(event,"move")}
      onPointerMove={moveMask}
      onPointerUp={endMask}
      onPointerCancel={endMask}
      onKeyDown={maskKeyboard}
     ><button
       type="button"
       className="twitch-mask-resize"
       aria-label="Resize blackout mask"
       title="Resize blackout mask"
       onPointerDown={event=>beginMask(event,"resize")}
       onPointerMove={moveMask}
       onPointerUp={endMask}
       onPointerCancel={endMask}
      /></div>}
    </div>
    {showChat&&activeChannel&&<iframe className="twitch-chat-frame" src={chatUrl} title="chat"/>}
   </div>:<div className="personal-empty">·</div>}
   {diagnostics&&<pre className="twitch-diagnostics">{JSON.stringify({activeChannel,activeSource:selectedSource,parentHost,playerUrl,chat:showChat,configured:data.configured,maskEnabled,mask,fullscreenActive,theaterMode},null,2)}</pre>}
  </section>
 </div>
}
