"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type MapLead = { id: string; name: string; lat: number; lng: number; score: number; website: string };
type Center = { lat: number; lng: number };
type Props = { leads: MapLead[]; selected: MapLead | null; searchCenter: Center; searchLabel: string; onSelect: (lead: MapLead) => void; onUseCenter: (center: Center) => void };
type ProjectedLead = { lead: MapLead; x: number; y: number };
type MarkerGroup = { key: string; x: number; y: number; leads: MapLead[] };

const TILE_SIZE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 19;

function clampLat(lat: number) { return Math.max(-85.05112878, Math.min(85.05112878, lat)); }
function normalizeLng(lng: number) { let value = lng; while (value < -180) value += 360; while (value >= 180) value -= 360; return value; }
function worldSize(zoom: number) { return TILE_SIZE * 2 ** zoom; }
function lngToWorldX(lng: number, zoom: number) { return ((normalizeLng(lng) + 180) / 360) * worldSize(zoom); }
function latToWorldY(lat: number, zoom: number) { const limited = clampLat(lat); const sin = Math.sin((limited * Math.PI) / 180); return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize(zoom); }
function worldXToLng(x: number, zoom: number) { return normalizeLng((x / worldSize(zoom)) * 360 - 180); }
function worldYToLat(y: number, zoom: number) { const n = Math.PI - (2 * Math.PI * y) / worldSize(zoom); return clampLat((180 / Math.PI) * Math.atan(Math.sinh(n))); }
function nearestWrappedX(x: number, centerX: number, size: number) { let next = x; while (next - centerX > size / 2) next -= size; while (centerX - next > size / 2) next += size; return next; }
function validPoint(lead: MapLead) { return Number.isFinite(lead.lat) && Number.isFinite(lead.lng) && Math.abs(lead.lat) <= 90 && Math.abs(lead.lng) <= 180 && !(lead.lat === 0 && lead.lng === 0); }

function fitZoom(points: MapLead[], width: number, height: number) {
  if (!points.length || width <= 0 || height <= 0) return null;
  if (points.length === 1) return { center: { lat: points[0].lat, lng: points[0].lng }, zoom: 15 };
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const south = Math.min(...latitudes);
  const north = Math.max(...latitudes);
  let west = Math.min(...longitudes);
  let east = Math.max(...longitudes);
  if (east - west > 180) { const shifted = longitudes.map((lng) => (lng < 0 ? lng + 360 : lng)); west = Math.min(...shifted); east = Math.max(...shifted); }
  const centerLng = normalizeLng((west + east) / 2);
  const centerLat = (south + north) / 2;
  for (let zoom = MAX_ZOOM; zoom >= MIN_ZOOM; zoom -= 1) {
    const size = worldSize(zoom);
    const x1 = lngToWorldX(west, zoom);
    const x2 = nearestWrappedX(lngToWorldX(east, zoom), x1, size);
    const y1 = latToWorldY(north, zoom);
    const y2 = latToWorldY(south, zoom);
    if (Math.abs(x2 - x1) <= width - 100 && Math.abs(y2 - y1) <= height - 100) return { center: { lat: centerLat, lng: centerLng }, zoom };
  }
  return { center: { lat: centerLat, lng: centerLng }, zoom: MIN_ZOOM };
}

function clusterMarkers(points: ProjectedLead[], zoom: number): MarkerGroup[] {
  if (zoom >= 15) return points.map((point) => ({ key: point.lead.id, x: point.x, y: point.y, leads: [point.lead] }));
  const cell = zoom <= 10 ? 64 : 48;
  const map = new Map<string, ProjectedLead[]>();
  for (const point of points) {
    const key = `${Math.floor(point.x / cell)}:${Math.floor(point.y / cell)}`;
    const list = map.get(key) || [];
    list.push(point);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([key, list]) => ({ key, x: list.reduce((sum, item) => sum + item.x, 0) / list.length, y: list.reduce((sum, item) => sum + item.y, 0) / list.length, leads: list.map((item) => item.lead) }));
}

export default function BusinessMap({ leads, selected, searchCenter, searchLabel, onSelect, onUseCenter }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; centerX: number; centerY: number } | null>(null);
  const lastFitKeyRef = useRef("");
  const wheelHandlerRef = useRef<(event: WheelEvent) => void>(() => {});
  const [size, setSize] = useState({ width: 900, height: 520 });
  const [center, setCenter] = useState<Center>({ lat: searchCenter.lat, lng: searchCenter.lng });
  const [zoom, setZoom] = useState(11);
  const [mapFocused, setMapFocused] = useState(false);
  const visibleLeads = useMemo(() => leads.filter(validPoint).slice(0, 1200), [leads]);

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
    if (Number.isFinite(searchCenter.lat) && Number.isFinite(searchCenter.lng)) setCenter({ lat: searchCenter.lat, lng: searchCenter.lng });
  }, [searchCenter.lat, searchCenter.lng]);

  useEffect(() => {
    const key = visibleLeads.map((lead) => lead.id).sort().join("|");
    if (!key || key === lastFitKeyRef.current || size.width <= 0 || size.height <= 0) return;
    const fit = fitZoom(visibleLeads, size.width, size.height);
    if (!fit) return;
    lastFitKeyRef.current = key;
    setCenter(fit.center);
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit.zoom)));
  }, [visibleLeads, size.width, size.height]);

  const centerX = lngToWorldX(center.lng, zoom);
  const centerY = latToWorldY(center.lat, zoom);
  const left = centerX - size.width / 2;
  const top = centerY - size.height / 2;
  const tileCount = 2 ** zoom;
  const startTileX = Math.floor(left / TILE_SIZE) - 1;
  const endTileX = Math.floor((left + size.width) / TILE_SIZE) + 1;
  const startTileY = Math.max(0, Math.floor(top / TILE_SIZE) - 1);
  const endTileY = Math.min(tileCount - 1, Math.floor((top + size.height) / TILE_SIZE) + 1);
  const tiles: Array<{ key: string; sourceX: number; y: number; left: number; top: number }> = [];
  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
    const sourceX = ((tileX % tileCount) + tileCount) % tileCount;
    tiles.push({ key: `${zoom}-${tileX}-${tileY}`, sourceX, y: tileY, left: tileX * TILE_SIZE - left, top: tileY * TILE_SIZE - top });
  }

  const projected = visibleLeads.map((lead) => ({ lead, x: nearestWrappedX(lngToWorldX(lead.lng, zoom), centerX, worldSize(zoom)) - left, y: latToWorldY(lead.lat, zoom) - top })).filter((point) => point.x >= -40 && point.y >= -40 && point.x <= size.width + 40 && point.y <= size.height + 40);
  const markerGroups = clusterMarkers(projected, zoom);

  function setZoomAt(nextZoomRaw: number, clientX?: number, clientY?: number) {
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(nextZoomRaw)));
    if (nextZoom === zoom) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const px = rect && clientX != null ? clientX - rect.left : size.width / 2;
    const py = rect && clientY != null ? clientY - rect.top : size.height / 2;
    const anchorLng = worldXToLng(left + px, zoom);
    const anchorLat = worldYToLat(top + py, zoom);
    const nextCenterX = lngToWorldX(anchorLng, nextZoom) - px + size.width / 2;
    const nextCenterY = latToWorldY(anchorLat, nextZoom) - py + size.height / 2;
    setCenter({ lat: worldYToLat(nextCenterY, nextZoom), lng: worldXToLng(nextCenterX, nextZoom) });
    setZoom(nextZoom);
  }

  wheelHandlerRef.current = (event: WheelEvent) => {
    if (!event.cancelable) return;
    event.preventDefault();
    event.stopPropagation();
    setZoomAt(zoom + (event.deltaY < 0 ? 1 : -1), event.clientX, event.clientY);
  };

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const listener = (event: WheelEvent) => wheelHandlerRef.current(event);
    node.addEventListener("wheel", listener, { passive: false });
    return () => node.removeEventListener("wheel", listener);
  }, []);

  function fitResults() { const fit = fitZoom(visibleLeads, size.width, size.height); if (fit) { setCenter(fit.center); setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit.zoom))); } }
  function focusLead(lead: MapLead) { setCenter({ lat: lead.lat, lng: lead.lng }); setZoom((old) => Math.max(old, 16)); onSelect(lead); }
  function pan(dx: number, dy: number) { setCenter({ lat: worldYToLat(centerY + dy, zoom), lng: worldXToLng(centerX + dx, zoom) }); }

  return <section className="terminal-map panel stack">
    <div className="spread map-head"><div><p className="badge">GREEN TERMINAL MAP</p><h2>Business locations and search coverage</h2><p className="muted small">Real streets and cities · exact business coordinates · drag to move · scroll to zoom · clustered markers reduce overlap</p></div><div className="map-controls row"><button type="button" onClick={() => setZoomAt(zoom + 1)} aria-label="Zoom in" title="Zoom in">＋</button><button type="button" onClick={() => setZoomAt(zoom - 1)} aria-label="Zoom out" title="Zoom out">−</button><button type="button" onClick={fitResults} disabled={!visibleLeads.length}>Fit results</button><button type="button" onClick={() => { setCenter(searchCenter); setZoom(12); }}>Search area</button><button type="button" onClick={() => onUseCenter(center)}>Use map centre</button></div></div>
    <div className="map-legend"><span><i className="legend-pin selected"/>Selected</span><span><i className="legend-pin hot"/>High opportunity</span><span><i className="legend-pin"/>Business</span><span><i className="legend-cluster">4</i>Grouped businesses</span></div>
    <div
      ref={containerRef}
      className={`slippy-map ${mapFocused ? "focused" : ""}`}
      role="application"
      tabIndex={0}
      aria-label="Interactive street map of businesses. Use arrow keys to move and plus or minus to zoom."
      onFocus={() => setMapFocused(true)}
      onBlur={() => setMapFocused(false)}
      onDoubleClick={(event) => setZoomAt(zoom + 1, event.clientX, event.clientY)}
      onKeyDown={(event) => {
        if (event.key === "+" || event.key === "=") { event.preventDefault(); setZoomAt(zoom + 1); }
        else if (event.key === "-") { event.preventDefault(); setZoomAt(zoom - 1); }
        else if (event.key === "ArrowUp") { event.preventDefault(); pan(0, -90); }
        else if (event.key === "ArrowDown") { event.preventDefault(); pan(0, 90); }
        else if (event.key === "ArrowLeft") { event.preventDefault(); pan(-90, 0); }
        else if (event.key === "ArrowRight") { event.preventDefault(); pan(90, 0); }
      }}
      onPointerDown={(event) => { if (event.button !== 0) return; dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, centerX, centerY }; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); }}
      onPointerMove={(event) => { const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; const dx = event.clientX - drag.x; const dy = event.clientY - drag.y; setCenter({ lat: worldYToLat(drag.centerY - dy, zoom), lng: worldXToLng(drag.centerX - dx, zoom) }); }}
      onPointerUp={(event) => { dragRef.current = null; try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {} }}
      onPointerCancel={() => { dragRef.current = null; }}
    >
      <div className="map-tile-layer" aria-hidden="true">{tiles.map((tile) => <img key={tile.key} className="map-tile" src={`https://tile.openstreetmap.org/${zoom}/${tile.sourceX}/${tile.y}.png`} alt="" draggable={false} loading="eager" style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}/>)}</div>
      <div className="map-search-center" style={{ left: size.width / 2, top: size.height / 2 }} title={`Map centre: ${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`}/>
      <div className="map-marker-layer">{markerGroups.map((group) => {
        if (group.leads.length > 1) return <button type="button" key={group.key} className="street-map-cluster" style={{ left: group.x, top: group.y }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setCenter({ lat: group.leads.reduce((sum, lead) => sum + lead.lat, 0) / group.leads.length, lng: group.leads.reduce((sum, lead) => sum + lead.lng, 0) / group.leads.length }); setZoom(Math.min(MAX_ZOOM, zoom + 2)); }} title={`${group.leads.length} businesses. Click to zoom in.`}>{group.leads.length}</button>;
        const lead = group.leads[0];
        const active = selected?.id === lead.id;
        const hot = lead.score >= 70 || !lead.website;
        return <button type="button" key={lead.id} className={`street-map-pin ${active ? "selected" : hot ? "hot" : ""}`} style={{ left: group.x, top: group.y }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); focusLead(lead); }} title={`${lead.name} · ${lead.lat.toFixed(5)}, ${lead.lng.toFixed(5)}`} aria-label={`Open ${lead.name}`}><span className="street-pin-dot"/>{active && <span className="street-pin-label"><strong>{lead.name}</strong><small>{lead.website ? "Website found" : "No website found"}</small></span>}</button>;
      })}</div>
      <div className="map-interaction-hint">{mapFocused ? "Map controls active" : "Click the map, then drag or scroll"}</div>
      <div className="map-coordinate-readout">{center.lat.toFixed(5)}, {center.lng.toFixed(5)} · zoom {zoom}</div>
      <div className="map-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></div>
    </div>
    <div className="spread map-foot"><p className="muted small">Marker positions use the latitude and longitude returned by the business search provider.</p><p className="muted small">Mapped: {visibleLeads.length} · visible groups: {markerGroups.length}</p></div>
  </section>;
}
