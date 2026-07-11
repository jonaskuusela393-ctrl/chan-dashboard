"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EarthLocation } from "./gameData";
import { ORBITAL_NODES } from "./gameData";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  WORLD_COAST_PATHS,
  WORLD_COUNTRY_PATHS,
  WORLD_LAND_PATHS,
  WORLD_MAP_COUNTS,
} from "./worldMapData";

export type GameUnitMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  domain: string;
  strength: number;
  hostile?: boolean;
};

type MapProps = {
  locations: EarthLocation[];
  units: GameUnitMarker[];
  selected: EarthLocation | null;
  onSelect: (location: EarthLocation) => void;
};

type View = { x: number; y: number; w: number; h: number };

function project(lng: number, lat: number) {
  return {
    x: ((lng + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

function clampView(view: View): View {
  const minW = 18;
  const minH = minW * (MAP_HEIGHT / MAP_WIDTH);
  const w = Math.max(minW, Math.min(MAP_WIDTH, view.w));
  const h = Math.max(minH, Math.min(MAP_HEIGHT, view.h));
  return {
    x: Math.max(0, Math.min(MAP_WIDTH - w, view.x)),
    y: Math.max(0, Math.min(MAP_HEIGHT - h, view.y)),
    w,
    h,
  };
}

function focusView(lng: number, lat: number, width: number): View {
  const point = project(lng, lat);
  const w = width;
  const h = w * (MAP_HEIGHT / MAP_WIDTH);
  return clampView({ x: point.x - w / 2, y: point.y - h / 2, w, h });
}

export function StrategicEarthMap({ locations, units, selected, onSelect }: MapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; view: View } | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT });
  const zoom = MAP_WIDTH / view.w;

  function zoomAt(clientX: number, clientY: number, scale: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * view.w + view.x;
    const py = ((clientY - rect.top) / rect.height) * view.h + view.y;
    const nextW = view.w * scale;
    const nextH = view.h * scale;
    setView(clampView({
      x: px - (px - view.x) * scale,
      y: py - (py - view.y) * scale,
      w: nextW,
      h: nextH,
    }));
  }

  function zoomCenter(scale: number) {
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    const w = view.w * scale;
    const h = view.h * scale;
    setView(clampView({ x: cx - w / 2, y: cy - h / 2, w, h }));
  }

  function focus(location: EarthLocation, width = 90) {
    setView(focusView(location.lng, location.lat, width));
    onSelect(location);
  }

  return (
    <section className="halo-map-panel stack">
      <div className="halo-map-toolbar spread">
        <div>
          <p className="halo-eyebrow">UEG STRATEGIC CARTOGRAPHY // EARTH</p>
          <h2>Global command map</h2>
          <p className="muted small">Original green coast/country style · drag · wheel zoom · tactical locations and units</p>
        </div>
        <div className="row halo-map-buttons">
          <button type="button" onClick={() => zoomCenter(0.62)}>+</button>
          <button type="button" onClick={() => zoomCenter(1.45)}>−</button>
          <button type="button" onClick={() => setView(focusView(39.6682, -4.0435, 42))}>Mombasa</button>
          <button type="button" onClick={() => setView(focusView(-74.006, 40.7128, 65))}>New York</button>
          <button type="button" onClick={() => setView({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT })}>world</button>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="halo-world-svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="application"
        aria-label="Interactive Halo Earth strategic world map"
        onWheel={(event) => {
          event.preventDefault();
          zoomAt(event.clientX, event.clientY, event.deltaY > 0 ? 1.16 : 0.84);
        }}
        onDoubleClick={(event) => zoomAt(event.clientX, event.clientY, 0.56)}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { x: event.clientX, y: event.clientY, view };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const svg = svgRef.current;
          if (!drag || !svg) return;
          const rect = svg.getBoundingClientRect();
          const dx = ((event.clientX - drag.x) / rect.width) * drag.view.w;
          const dy = ((event.clientY - drag.y) / rect.height) * drag.view.h;
          setView(clampView({ ...drag.view, x: drag.view.x - dx, y: drag.view.y - dy }));
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
        }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <defs>
          <filter id="haloMapGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation={Math.max(0.22, 1.05 / zoom)} result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="haloGrid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M 25 0 L 0 0 0 25" className="halo-grid-line" />
          </pattern>
        </defs>
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="halo-map-ocean" />
        <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#haloGrid)" opacity="0.68" />
        <g className="halo-graticule" aria-hidden="true">
          {[-120, -60, 0, 60, 120].map((lng) => {
            const x = project(lng, 0).x;
            return <line key={lng} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} />;
          })}
          {[-60, -30, 0, 30, 60].map((lat) => {
            const y = project(0, lat).y;
            return <line key={lat} x1={0} y1={y} x2={MAP_WIDTH} y2={y} />;
          })}
        </g>
        <g className="halo-land" filter="url(#haloMapGlow)">{WORLD_LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
        <g className="halo-coast">{WORLD_COAST_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
        <g className="halo-country-borders">{WORLD_COUNTRY_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
        <g className="halo-location-layer">
          {locations.map((location) => {
            const point = project(location.lng, location.lat);
            const active = selected?.id === location.id;
            const canonClass = location.confidence === "canon" ? "canon" : location.confidence === "speculative" ? "speculative" : "inferred";
            return (
              <g
                key={location.id}
                className={`halo-location ${active ? "active" : ""} ${canonClass}`}
                onClick={() => focus(location, zoom > 4 ? view.w : 85)}
                tabIndex={0}
                role="button"
                aria-label={`Open ${location.name}`}
              >
                <circle cx={point.x} cy={point.y} r={active ? 5.2 / Math.sqrt(zoom) : 3.1 / Math.sqrt(zoom)} />
                <circle className="halo-location-ring" cx={point.x} cy={point.y} r={active ? 10 / Math.sqrt(zoom) : 6 / Math.sqrt(zoom)} />
                {(active || zoom >= 3.2 || location.importance >= 92) && (
                  <text x={point.x + 6 / zoom} y={point.y - 5 / zoom} style={{ fontSize: `${Math.max(3.2, 9 / zoom)}px` }}>
                    {location.name.toUpperCase()}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <g className="halo-unit-layer">
          {units.map((unit) => {
            const point = project(unit.lng, unit.lat);
            return (
              <g key={unit.id} className={`halo-unit-marker ${unit.hostile ? "hostile" : "friendly"}`}>
                <path d={`M${point.x},${point.y - 4 / Math.sqrt(zoom)} L${point.x + 4 / Math.sqrt(zoom)},${point.y + 3 / Math.sqrt(zoom)} L${point.x - 4 / Math.sqrt(zoom)},${point.y + 3 / Math.sqrt(zoom)} Z`} />
                {zoom >= 3.5 && <text x={point.x + 5 / zoom} y={point.y + 4 / zoom} style={{ fontSize: `${Math.max(3, 8 / zoom)}px` }}>{unit.name}</text>}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="spread halo-map-footer">
        <span>{WORLD_MAP_COUNTS.countries} country-border segments · {WORLD_MAP_COUNTS.coast} coast segments</span>
        <span>{zoom.toFixed(1)}x · {locations.length} strategic sites · {units.length} units</span>
      </div>
    </section>
  );
}

const TILE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 19;
function clampLat(lat: number) { return Math.max(-85.05112878, Math.min(85.05112878, lat)); }
function normalizeLng(lng: number) { let value = lng; while (value < -180) value += 360; while (value >= 180) value -= 360; return value; }
function worldSize(zoom: number) { return TILE * 2 ** zoom; }
function lngX(lng: number, zoom: number) { return ((normalizeLng(lng) + 180) / 360) * worldSize(zoom); }
function latY(lat: number, zoom: number) { const value = clampLat(lat); const sin = Math.sin(value * Math.PI / 180); return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize(zoom); }
function xLng(x: number, zoom: number) { return normalizeLng((x / worldSize(zoom)) * 360 - 180); }
function yLat(y: number, zoom: number) { const n = Math.PI - (2 * Math.PI * y) / worldSize(zoom); return clampLat(180 / Math.PI * Math.atan(Math.sinh(n))); }
function wrappedX(x: number, center: number, size: number) { let next = x; while (next - center > size / 2) next -= size; while (center - next > size / 2) next += size; return next; }

export function SurfaceEarthMap({ locations, units, selected, onSelect }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; centerX: number; centerY: number } | null>(null);
  const [size, setSize] = useState({ width: 960, height: 620 });
  const [center, setCenter] = useState({ lat: -4.0435, lng: 39.6682 });
  const [zoom, setZoom] = useState(12);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeStatus, setPlaceStatus] = useState("");

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setSize({ width: Math.max(280, node.clientWidth), height: Math.max(360, node.clientHeight) });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setCenter({ lat: selected.lat, lng: selected.lng });
    setZoom((old) => Math.max(old, selected.id.includes("mombasa") ? 14 : 11));
  }, [selected?.id]);

  const centerX = lngX(center.lng, zoom);
  const centerY = latY(center.lat, zoom);
  const left = centerX - size.width / 2;
  const top = centerY - size.height / 2;
  const count = 2 ** zoom;
  const tiles = [] as Array<{ key: string; sx: number; y: number; left: number; top: number }>;
  for (let ty = Math.max(0, Math.floor(top / TILE) - 1); ty <= Math.min(count - 1, Math.floor((top + size.height) / TILE) + 1); ty += 1) {
    for (let tx = Math.floor(left / TILE) - 1; tx <= Math.floor((left + size.width) / TILE) + 1; tx += 1) {
      const sx = ((tx % count) + count) % count;
      tiles.push({ key: `${zoom}-${tx}-${ty}`, sx, y: ty, left: tx * TILE - left, top: ty * TILE - top });
    }
  }

  function zoomAt(nextRaw: number, clientX?: number, clientY?: number) {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(nextRaw)));
    if (next === zoom) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const px = rect && clientX != null ? clientX - rect.left : size.width / 2;
    const py = rect && clientY != null ? clientY - rect.top : size.height / 2;
    const anchorLng = xLng(left + px, zoom);
    const anchorLat = yLat(top + py, zoom);
    const nextCenterX = lngX(anchorLng, next) - px + size.width / 2;
    const nextCenterY = latY(anchorLat, next) - py + size.height / 2;
    setCenter({ lat: yLat(nextCenterY, next), lng: xLng(nextCenterX, next) });
    setZoom(next);
  }

  function jump(location: EarthLocation) {
    onSelect(location);
    setCenter({ lat: location.lat, lng: location.lng });
    setZoom(location.id.includes("mombasa") ? 15 : 12);
  }

  async function findPlace() {
    const address = placeQuery.trim();
    if (!address) return;
    setPlaceStatus("searching...");
    try {
      const response = await fetch(`/api/business/geocode?address=${encodeURIComponent(address)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok || !Number.isFinite(data.lat) || !Number.isFinite(data.lng)) throw new Error(data?.error || "place not found");
      setCenter({ lat: Number(data.lat), lng: Number(data.lng) });
      setZoom(13);
      setPlaceStatus(String(data.address || address));
    } catch (error) {
      setPlaceStatus(error instanceof Error ? error.message : "place search failed");
    }
  }

  return (
    <section className="halo-map-panel stack">
      <div className="halo-map-toolbar spread">
        <div>
          <p className="halo-eyebrow">SURFACE INTELLIGENCE // OPEN STREET DATA</p>
          <h2>Roads, cities and tactical terrain</h2>
          <p className="muted small">Real-world OpenStreetMap geography tinted into the terminal style. Zoom to street level anywhere on Earth.</p>
        </div>
        <div className="row halo-map-buttons">
          <button type="button" onClick={() => zoomAt(zoom + 1)}>+</button>
          <button type="button" onClick={() => zoomAt(zoom - 1)}>−</button>
          {locations.filter((item) => ["new-mombasa", "voi", "sydney-highcom", "new-york"].includes(item.id)).map((item) => (
            <button type="button" key={item.id} onClick={() => jump(item)}>{item.name.replace(" / The Hive", "")}</button>
          ))}
        </div>
      </div>
      <div className="halo-place-search">
        <input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void findPlace(); } }} placeholder="Search any real city, road or address" aria-label="Search Earth place" />
        <button type="button" onClick={() => void findPlace()}>locate</button>
        <span>{placeStatus || "Uses the dashboard Google Geocoding key when configured."}</span>
      </div>
      <div
        ref={containerRef}
        className="halo-surface-map"
        role="application"
        aria-label="Interactive street-level Earth map"
        onWheel={(event) => { event.preventDefault(); zoomAt(zoom + (event.deltaY < 0 ? 1 : -1), event.clientX, event.clientY); }}
        onDoubleClick={(event) => zoomAt(zoom + 1, event.clientX, event.clientY)}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, centerX, centerY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.id !== event.pointerId) return;
          setCenter({ lat: yLat(drag.centerY - (event.clientY - drag.y), zoom), lng: xLng(drag.centerX - (event.clientX - drag.x), zoom) });
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
        }}
        onPointerCancel={() => { dragRef.current = null; }}
      >
        <div className="halo-tile-layer">
          {tiles.map((tile) => <img key={tile.key} className="halo-map-tile" alt="" draggable={false} src={`https://tile.openstreetmap.org/${zoom}/${tile.sx}/${tile.y}.png`} style={{ left: tile.left, top: tile.top, width: TILE, height: TILE }} />)}
        </div>
        <div className="halo-surface-overlay" />
        <div className="halo-surface-crosshair" />
        <div className="halo-surface-markers">
          {locations.map((location) => {
            const x = wrappedX(lngX(location.lng, zoom), centerX, worldSize(zoom)) - left;
            const y = latY(location.lat, zoom) - top;
            if (x < -80 || y < -80 || x > size.width + 80 || y > size.height + 80) return null;
            const active = selected?.id === location.id;
            return (
              <button
                type="button"
                key={location.id}
                className={`halo-surface-pin ${active ? "active" : ""} ${location.confidence}`}
                style={{ left: x, top: y }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => { event.stopPropagation(); jump(location); }}
                title={`${location.name} · ${location.confidence}`}
              >
                <span className="halo-surface-dot" />
                {(active || zoom >= 11) && <span className="halo-surface-label">{location.name}</span>}
              </button>
            );
          })}
          {units.map((unit) => {
            const x = wrappedX(lngX(unit.lng, zoom), centerX, worldSize(zoom)) - left;
            const y = latY(unit.lat, zoom) - top;
            if (x < -40 || y < -40 || x > size.width + 40 || y > size.height + 40) return null;
            return <div key={unit.id} className={`halo-surface-unit ${unit.hostile ? "hostile" : "friendly"}`} style={{ left: x, top: y }} title={`${unit.name} · strength ${unit.strength}`}><span>{unit.domain.slice(0, 1).toUpperCase()}</span></div>;
          })}
        </div>
        <div className="halo-map-coordinates">{center.lat.toFixed(5)}, {center.lng.toFixed(5)} · Z{zoom}</div>
        <div className="halo-osm-credit">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></div>
      </div>
    </section>
  );
}

export function OrbitalEarthMap({ locations, units, selected, onSelect }: MapProps) {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(0.86);
  const dragRef = useRef<{ id: number; x: number; rotation: number } | null>(null);
  const earthLocations = useMemo(() => locations.filter((item) => item.importance >= 74), [locations]);
  const planetX = 500;
  const planetY = 310;
  const radius = 235 * scale;

  function shiftedX(lng: number) {
    const raw = ((lng + 180 + rotation) % 360 + 360) % 360;
    return planetX - radius + (raw / 360) * radius * 2;
  }
  function shiftedY(lat: number) { return planetY - (lat / 90) * radius * 0.9; }

  return (
    <section className="halo-map-panel stack">
      <div className="halo-map-toolbar spread">
        <div>
          <p className="halo-eyebrow">EARTH ORBITAL DEFENSE GRID</p>
          <h2>Planet and orbital layer</h2>
          <p className="muted small">Drag the globe · wheel zoom · defense platforms, tethers and fleet contacts</p>
        </div>
        <div className="row halo-map-buttons">
          <button type="button" onClick={() => setScale((old) => Math.min(1.12, old + 0.08))}>+</button>
          <button type="button" onClick={() => setScale((old) => Math.max(0.64, old - 0.08))}>−</button>
          <button type="button" onClick={() => setRotation(0)}>prime meridian</button>
        </div>
      </div>
      <svg
        className="halo-orbit-svg"
        viewBox="0 0 1000 620"
        role="application"
        aria-label="Interactive Earth orbital map"
        onWheel={(event) => { event.preventDefault(); setScale((old) => Math.max(0.64, Math.min(1.12, old + (event.deltaY < 0 ? 0.06 : -0.06)))); }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { id: event.pointerId, x: event.clientX, rotation };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.id !== event.pointerId) return;
          setRotation(drag.rotation + (event.clientX - drag.x) * 0.32);
        }}
        onPointerUp={(event) => {
          dragRef.current = null;
          try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
        }}
      >
        <defs>
          <radialGradient id="earthHalo" cx="42%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#123126" />
            <stop offset="70%" stopColor="#04120d" />
            <stop offset="100%" stopColor="#000603" />
          </radialGradient>
          <filter id="orbitGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <clipPath id="earthClip"><circle cx={planetX} cy={planetY} r={radius} /></clipPath>
        </defs>
        <rect width="1000" height="620" className="halo-space-bg" />
        {[radius + 38, radius + 78, radius + 122].map((r) => <ellipse key={r} cx={planetX} cy={planetY} rx={r * 1.23} ry={r * 0.43} className="halo-orbit-ring" />)}
        <circle cx={planetX} cy={planetY} r={radius + 7} className="halo-atmosphere" filter="url(#orbitGlow)" />
        <circle cx={planetX} cy={planetY} r={radius} fill="url(#earthHalo)" />
        <g clipPath="url(#earthClip)">
          {[-1, 0, 1].map((wrap) => (
            <g key={wrap} transform={`translate(${planetX - radius + wrap * radius * 2 + (rotation / 360) * radius * 2},${planetY - radius * 0.58}) scale(${(radius * 2) / MAP_WIDTH},${(radius * 1.16) / MAP_HEIGHT})`} className="halo-globe-land">
              {WORLD_LAND_PATHS.map((d, i) => <path key={i} d={d} />)}
              {WORLD_COUNTRY_PATHS.map((d, i) => <path key={`c-${i}`} d={d} className="halo-globe-country" />)}
            </g>
          ))}
          {earthLocations.map((location) => {
            const x = shiftedX(location.lng);
            const y = shiftedY(location.lat);
            if (Math.abs(x - planetX) > radius) return null;
            return <g key={location.id} className={`halo-orbit-ground-node ${selected?.id === location.id ? "active" : ""}`} onClick={() => onSelect(location)}><circle cx={x} cy={y} r="4"/><text x={x + 7} y={y - 5}>{location.name}</text></g>;
          })}
        </g>
        {ORBITAL_NODES.map((node, index) => {
          const angle = (index / ORBITAL_NODES.length) * Math.PI * 2 - 0.5;
          const orbitRadius = radius + 62 + (index % 2) * 42;
          const x = planetX + Math.cos(angle) * orbitRadius * 1.25;
          const y = planetY + Math.sin(angle) * orbitRadius * 0.44;
          return (
            <g key={node.id} className={`halo-orbital-node ${node.type.toLowerCase()}`}>
              <line x1={planetX} y1={planetY} x2={x} y2={y} className="halo-orbit-vector" />
              <rect x={x - 6} y={y - 6} width="12" height="12" transform={`rotate(45 ${x} ${y})`} />
              <text x={x + 10} y={y - 7}>{node.name.toUpperCase()}</text>
              <text x={x + 10} y={y + 8} className="halo-orbit-subtext">{node.type} // DEF {node.defense}</text>
            </g>
          );
        })}
        {units.filter((unit) => unit.domain === "orbit" || unit.domain === "space").map((unit, index) => {
          const angle = 1.4 + index * 0.38;
          const r = radius + 155;
          const x = planetX + Math.cos(angle) * r * 1.15;
          const y = planetY + Math.sin(angle) * r * 0.42;
          return <g key={unit.id} className={`halo-orbit-fleet ${unit.hostile ? "hostile" : "friendly"}`}><path d={`M${x - 9},${y + 5} L${x + 11},${y} L${x - 9},${y - 5} Z`} /><text x={x + 14} y={y + 4}>{unit.name}</text></g>;
        })}
      </svg>
      <div className="spread halo-map-footer"><span>Orbital grid integrity is calculated by defense events and deployed units.</span><span>rotation {Math.round(rotation)}°</span></div>
    </section>
  );
}
