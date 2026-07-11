"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CANON_EVENTS,
  DIPLOMACY_FACTIONS,
  EARTH_LOCATIONS,
  RESEARCH,
  UNIT_DEFINITIONS,
  type CanonEvent,
  type Domain,
  type EarthLocation,
  type UnitDefinition,
} from "./gameData";
import { OrbitalEarthMap, StrategicEarthMap, SurfaceEarthMap, type GameUnitMarker } from "./EarthMaps";

type MapMode = "strategic" | "surface" | "orbit" | "system";
type PanelMode = "command" | "forces" | "production" | "research" | "diplomacy" | "templates" | "lore" | "events";

type Resources = {
  credits: number;
  materials: number;
  energy: number;
  food: number;
  intel: number;
  manpower: number;
};

type LocationState = {
  defense: number;
  integrity: number;
  supply: number;
  control: "UEG" | "CONTESTED" | "COVENANT";
};

type GameUnit = GameUnitMarker & {
  definitionId: string;
  locationId: string;
  attack: number;
  defense: number;
  speed: number;
  experience: number;
};

type QueueItem = {
  id: string;
  definitionId: string;
  targetId: string;
  progress: number;
  required: number;
  customName?: string;
  customStats?: Pick<UnitDefinition, "domain" | "attack" | "defense" | "speed">;
};

type ResearchState = { id: string; progress: number } | null;

type Template = {
  id: string;
  name: string;
  infantry: number;
  armor: number;
  air: number;
  artillery: number;
  logistics: number;
  attack: number;
  defense: number;
  speed: number;
  credits: number;
  materials: number;
  manpower: number;
  hours: number;
};

type LogEntry = { id: string; time: number; text: string; kind: "info" | "good" | "warn" | "danger" };

type SaveData = {
  version: 1;
  gameTime: number;
  speed: number;
  resources: Resources;
  locationState: Record<string, LocationState>;
  units: GameUnit[];
  queue: QueueItem[];
  activeResearch: ResearchState;
  completedResearch: string[];
  firedEvents: string[];
  diplomacy: Record<string, number>;
  templates: Template[];
  log: LogEntry[];
};

const SAVE_KEY = "halo-earth-command-save-v1";
const START_TIME = Date.parse("2552-10-19T06:00:00Z");
const SPEEDS = [0, 1, 6, 24, 72] as const;

function initialLocationState() {
  return Object.fromEntries(EARTH_LOCATIONS.map((location) => [location.id, {
    defense: location.defense,
    integrity: 100,
    supply: 80,
    control: "UEG" as const,
  }]));
}

function initialUnits(): GameUnit[] {
  return [
    { id: "u-highcom-1", name: "HIGHCOM Defense Group", definitionId: "marine-brigade", domain: "ground", locationId: "sydney-highcom", lat: -33.8688, lng: 151.2093, strength: 84, attack: 48, defense: 82, speed: 34, experience: 38 },
    { id: "u-mombasa-1", name: "7th ODST Battalion", definitionId: "odst-group", domain: "ground", locationId: "new-mombasa", lat: -4.0435, lng: 39.6682, strength: 76, attack: 63, defense: 48, speed: 78, experience: 54 },
    { id: "u-homefleet-1", name: "Home Fleet Screen", definitionId: "frigate", domain: "space", locationId: "new-mombasa", lat: 8, lng: 18, strength: 88, attack: 84, defense: 72, speed: 78, experience: 45 },
    { id: "u-quito-1", name: "Quito Aerospace Wing", definitionId: "air-wing", domain: "air", locationId: "quito-tether", lat: -0.1807, lng: -78.4678, strength: 72, attack: 72, defense: 52, speed: 94, experience: 28 },
    { id: "u-diego-1", name: "Indian Ocean Group", definitionId: "naval-group", domain: "naval", locationId: "diego-garcia", lat: -7.3195, lng: 72.4229, strength: 70, attack: 60, defense: 74, speed: 52, experience: 32 },
  ];
}

function initialDiplomacy() {
  return Object.fromEntries(DIPLOMACY_FACTIONS.map((faction) => [faction.id, faction.relation]));
}

function makeLog(text: string, time: number, kind: LogEntry["kind"] = "info"): LogEntry {
  return { id: `${time}-${Math.random().toString(36).slice(2, 8)}`, time, text, kind };
}

function formatGameTime(ms: number) {
  const date = new Date(ms);
  const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(date).toUpperCase();
  return `${date.getUTCFullYear()} ${month} ${String(date.getUTCDate()).padStart(2, "0")} // ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
}

function clamp(value: number, min = 0, max = 100) { return Math.max(min, Math.min(max, value)); }
function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function SolarSystemView() {
  const [selected, setSelected] = useState("earth");
  const bodies = [
    { id: "mercury", name: "Mercury", type: "orbital only", distance: 10, size: 7 },
    { id: "venus", name: "Venus", type: "orbital only", distance: 17, size: 10 },
    { id: "earth", name: "Earth", type: "active theater", distance: 25, size: 11 },
    { id: "mars", name: "Mars", type: "future surface theater", distance: 34, size: 8 },
    { id: "jupiter", name: "Jupiter", type: "orbital / moons", distance: 47, size: 20 },
    { id: "saturn", name: "Saturn", type: "orbital / moons", distance: 61, size: 17 },
    { id: "uranus", name: "Uranus", type: "orbital", distance: 74, size: 13 },
    { id: "neptune", name: "Neptune", type: "orbital", distance: 87, size: 13 },
  ];
  const body = bodies.find((item) => item.id === selected) || bodies[2];
  return (
    <section className="halo-map-panel stack">
      <div className="halo-map-toolbar spread">
        <div><p className="halo-eyebrow">SOL SYSTEM COMMAND</p><h2>Interplanetary theater framework</h2><p className="muted small">Earth is fully active. Luna, Mars and outer-system layers are prepared as later theaters.</p></div>
      </div>
      <div className="halo-system-map">
        <div className="halo-sun">SOL</div>
        {bodies.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`halo-planet ${selected === item.id ? "active" : ""} ${item.id}`}
            style={{ left: `${item.distance}%`, width: item.size * 2, height: item.size * 2 }}
            onClick={() => setSelected(item.id)}
            title={item.name}
          ><span>{item.name}</span></button>
        ))}
        <div className="halo-system-scanline" />
      </div>
      <div className="halo-system-detail grid">
        <div className="card"><span className="badge">SELECTED BODY</span><h3>{body.name}</h3><p className="muted">{body.type}</p></div>
        <div className="card"><span className="badge">EARTH MODULE STATUS</span><h3>Operational</h3><p className="muted">Surface, strategic and orbital maps connected to one simulation state.</p></div>
        <div className="card"><span className="badge">NEXT LOGICAL EXPANSION</span><h3>Luna + Mars</h3><p className="muted">Add colony regions, naval bases, orbital routes and Covenant operations without changing the Earth save format.</p></div>
      </div>
    </section>
  );
}

export default function EarthGameClient({ username }: { username: string }) {
  const [mapMode, setMapMode] = useState<MapMode>("strategic");
  const [panel, setPanel] = useState<PanelMode>("command");
  const [selectedId, setSelectedId] = useState("new-mombasa");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [gameTime, setGameTime] = useState(START_TIME);
  const [speed, setSpeed] = useState<number>(0);
  const [resources, setResources] = useState<Resources>({ credits: 840, materials: 720, energy: 92, food: 88, intel: 74, manpower: 640 });
  const [locationState, setLocationState] = useState<Record<string, LocationState>>(initialLocationState);
  const [units, setUnits] = useState<GameUnit[]>(initialUnits);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeResearch, setActiveResearch] = useState<ResearchState>(null);
  const [completedResearch, setCompletedResearch] = useState<string[]>([]);
  const [firedEvents, setFiredEvents] = useState<string[]>([]);
  const [diplomacy, setDiplomacy] = useState<Record<string, number>>(initialDiplomacy);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [log, setLog] = useState<LogEntry[]>([makeLog("Earth Defense Command initialized. Canon timeline pressure is active.", START_TIME, "good")]);
  const [news, setNews] = useState<{ event: CanonEvent; outcome: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [templateName, setTemplateName] = useState("Custom Battle Group");
  const [templateParts, setTemplateParts] = useState({ infantry: 4, armor: 2, air: 1, artillery: 2, logistics: 2 });
  const importRef = useRef<HTMLInputElement | null>(null);

  const selected = EARTH_LOCATIONS.find((item) => item.id === selectedId) || EARTH_LOCATIONS[0];
  const selectedState = locationState[selected.id] || initialLocationState()[selected.id];
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId) || null;
  const nextEvent = CANON_EVENTS.find((event) => !firedEvents.includes(event.id)) || null;
  const researchSpeed = completedResearch.includes("battle-net") ? 1.2 : 1;
  const globalAttackBonus = completedResearch.includes("shield-analysis") ? 15 : 0;
  const orbitalBonus = completedResearch.includes("mac-capacitors") ? 18 : 0;

  const deployedDefenseByLocation = useMemo(() => {
    const result: Record<string, number> = {};
    for (const unit of units) {
      if (unit.hostile) continue;
      result[unit.locationId] = (result[unit.locationId] || 0) + unit.defense * (unit.strength / 100) * 0.18;
    }
    return result;
  }, [units]);

  const mapUnits = useMemo(() => units.map((unit) => ({ ...unit, attack: unit.attack + globalAttackBonus + ((unit.domain === "orbit" || unit.domain === "space") ? orbitalBonus : 0) })), [units, globalAttackBonus, orbitalBonus]);

  const overall = useMemo(() => {
    const values = Object.values(locationState);
    const integrity = values.reduce((sum, value) => sum + value.integrity, 0) / Math.max(1, values.length);
    const contested = values.filter((value) => value.control !== "UEG").length;
    const orbital = clamp(72 + units.filter((unit) => unit.domain === "space" || unit.domain === "orbit").reduce((sum, unit) => sum + unit.strength * 0.08, 0) + orbitalBonus * 0.35);
    return { integrity, contested, orbital };
  }, [locationState, units, orbitalBonus]);

  const addLog = useCallback((text: string, kind: LogEntry["kind"] = "info", at = gameTime) => {
    setLog((old) => [makeLog(text, at, kind), ...old].slice(0, 160));
  }, [gameTime]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Partial<SaveData>;
        if (data.version === 1) {
          if (typeof data.gameTime === "number") setGameTime(data.gameTime);
          if (typeof data.speed === "number") setSpeed(data.speed);
          if (data.resources) setResources(data.resources);
          if (data.locationState) setLocationState(data.locationState);
          if (Array.isArray(data.units)) setUnits(data.units);
          if (Array.isArray(data.queue)) setQueue(data.queue);
          if (data.activeResearch !== undefined) setActiveResearch(data.activeResearch);
          if (Array.isArray(data.completedResearch)) setCompletedResearch(data.completedResearch);
          if (Array.isArray(data.firedEvents)) setFiredEvents(data.firedEvents);
          if (data.diplomacy) setDiplomacy(data.diplomacy);
          if (Array.isArray(data.templates)) setTemplates(data.templates);
          if (Array.isArray(data.log)) setLog(data.log);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const save: SaveData = { version: 1, gameTime, speed, resources, locationState, units, queue, activeResearch, completedResearch, firedEvents, diplomacy, templates, log };
    const timer = window.setTimeout(() => localStorage.setItem(SAVE_KEY, JSON.stringify(save)), 250);
    return () => window.clearTimeout(timer);
  }, [hydrated, gameTime, speed, resources, locationState, units, queue, activeResearch, completedResearch, firedEvents, diplomacy, templates, log]);

  useEffect(() => {
    if (!hydrated || speed <= 0) return;
    const timer = window.setInterval(() => {
      const hours = speed;
      setGameTime((old) => old + hours * 3600000);
      setResources((old) => ({
        credits: old.credits + hours / 24 * 18,
        materials: old.materials + hours / 24 * 13,
        energy: clamp(old.energy + hours / 24 * 0.6, 0, 100),
        food: clamp(old.food + hours / 24 * 0.35, 0, 100),
        intel: clamp(old.intel + hours / 24 * 0.9, 0, 100),
        manpower: old.manpower + hours / 24 * 4,
      }));
      setQueue((oldQueue) => {
        const updated = oldQueue.map((item) => ({ ...item, progress: item.progress + hours * (completedResearch.includes("urban-ai") ? 1.08 : 1) }));
        const completed = updated.filter((item) => item.progress >= item.required);
        if (completed.length) {
          window.setTimeout(() => {
            for (const item of completed) finishQueueItem(item);
          }, 0);
        }
        return updated.filter((item) => item.progress < item.required);
      });
      setActiveResearch((old) => {
        if (!old) return null;
        const definition = RESEARCH.find((item) => item.id === old.id);
        if (!definition) return null;
        const progress = old.progress + hours * researchSpeed;
        if (progress >= definition.hours) {
          window.setTimeout(() => {
            setCompletedResearch((list) => list.includes(definition.id) ? list : [...list, definition.id]);
            addLog(`Research completed: ${definition.name}. ${definition.effect}.`, "good");
          }, 0);
          return null;
        }
        return { ...old, progress };
      });
      setLocationState((old) => {
        const next = { ...old };
        for (const location of EARTH_LOCATIONS) {
          const state = next[location.id];
          if (!state) continue;
          const hostile = units.filter((unit) => unit.hostile && unit.locationId === location.id).reduce((sum, unit) => sum + unit.attack * unit.strength / 100, 0);
          const friendly = units.filter((unit) => !unit.hostile && unit.locationId === location.id).reduce((sum, unit) => sum + unit.defense * unit.strength / 100, 0);
          if (hostile > 0) {
            const delta = (hostile - friendly * 0.72 - state.defense * 0.35) * hours / 720;
            next[location.id] = {
              ...state,
              integrity: clamp(state.integrity - Math.max(0.03, delta)),
              supply: clamp(state.supply - Math.max(0.02, delta * 0.65)),
              control: state.integrity < 28 ? "COVENANT" : "CONTESTED",
            };
          } else if (state.control === "UEG") {
            next[location.id] = { ...state, supply: clamp(state.supply + hours / 240) };
          }
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hydrated, speed, completedResearch, researchSpeed, units, addLog]);

  useEffect(() => {
    if (!hydrated) return;
    const due = CANON_EVENTS.find((event) => !firedEvents.includes(event.id) && Date.parse(event.date) <= gameTime);
    if (!due) return;
    fireEvent(due);
  }, [gameTime, firedEvents, hydrated]);

  function fireEvent(event: CanonEvent) {
    let outcome = "The event follows the historical path.";
    if (event.id === "first-contact-earth") {
      setUnits((old) => old.some((unit) => unit.id === "covenant-spearhead") ? old : [...old,
        { id: "covenant-spearhead", name: "Regret's Expeditionary Fleet", definitionId: "covenant-fleet", domain: "space", locationId: "new-mombasa", lat: 12, lng: 28, strength: 100, attack: 116, defense: 102, speed: 92, experience: 78, hostile: true },
      ]);
      outcome = overall.orbital >= 92 ? "Your strengthened grid destroys additional battlecruisers, but Solemn Penance still forces the scripted Mombasa approach." : "The orbital grid takes heavy pressure as the Covenant punches toward the Mediterranean battle cluster.";
    }
    if (event.id === "mombasa-assault") {
      const state = locationState["new-mombasa"];
      const readiness = (state?.defense || 0) + (deployedDefenseByLocation["new-mombasa"] || 0);
      setLocationState((old) => ({ ...old, "new-mombasa": { ...old["new-mombasa"], control: readiness >= 95 ? "CONTESTED" : "CONTESTED", integrity: clamp(old["new-mombasa"].integrity - (readiness >= 95 ? 6 : 18)) } }));
      setUnits((old) => old.some((unit) => unit.id === "covenant-mombasa") ? old : [...old,
        { id: "covenant-mombasa", name: "Covenant Mombasa Occupation", definitionId: "covenant-ground", domain: "ground", locationId: "new-mombasa", lat: -4.0435, lng: 39.6682, strength: readiness >= 95 ? 74 : 100, attack: 92, defense: 78, speed: 52, experience: 68, hostile: true },
      ]);
      outcome = readiness >= 115 ? "Altered outcome: prepared UNSC forces contain the landing zones and preserve key evacuation corridors. Regret still reaches the Portal zone." : readiness >= 90 ? "Partially altered: the city is contested rather than rapidly overrun, but the main Covenant objective remains unavoidable." : "Canon pressure holds: Covenant forces occupy key sectors of Old and New Mombasa.";
    }
    if (event.id === "mombasa-rupture") {
      const defense = locationState["new-mombasa"]?.defense || 0;
      setLocationState((old) => ({ ...old, "new-mombasa": { ...old["new-mombasa"], integrity: clamp(old["new-mombasa"].integrity - (defense >= 100 ? 24 : 46)), supply: clamp(old["new-mombasa"].supply - 35) } }));
      outcome = defense >= 100 ? "The rupture cannot be prevented, but hardened infrastructure and evacuation planning save large sections of the city." : "The in-atmosphere rupture devastates New Mombasa. This is a hard canon event and cannot be fully prevented from Earth command.";
    }
    if (event.id === "london-occupied") {
      const readiness = (locationState.london?.defense || 0) + (deployedDefenseByLocation.london || 0);
      setLocationState((old) => ({ ...old, london: { ...old.london, control: readiness >= 95 ? "CONTESTED" : "COVENANT", integrity: clamp(old.london.integrity - (readiness >= 95 ? 8 : 25)) } }));
      setUnits((old) => old.some((unit) => unit.id === "covenant-london") ? old : [...old, { id: "covenant-london", name: "Jiralhanae London Force", definitionId: "covenant-ground", domain: "ground", locationId: "london", lat: 51.5072, lng: -0.1276, strength: readiness >= 95 ? 62 : 88, attack: 82, defense: 70, speed: 48, experience: 62, hostile: true }]);
      outcome = readiness >= 95 ? "Altered outcome: London avoids full occupation and becomes a contested urban fortress." : "London falls under Jiralhanae occupation as in the canon timeline.";
    }
    if (event.id === "great-schism") {
      setDiplomacy((old) => ({ ...old, sangheili: Math.max(old.sangheili || -40, 35) }));
      setUnits((old) => old.map((unit) => unit.id === "covenant-spearhead" ? { ...unit, strength: unit.strength * 0.78 } : unit));
      outcome = "The Covenant fractures. Sangheili diplomacy is now viable and loyalist fleet coordination weakens.";
    }
    if (event.id === "truth-arrives") {
      const readiness = (locationState.voi?.defense || 0) + (deployedDefenseByLocation.voi || 0);
      setLocationState((old) => ({ ...old, voi: { ...old.voi, control: "CONTESTED", integrity: clamp(old.voi.integrity - (readiness >= 120 ? 12 : 35)) } }));
      setUnits((old) => old.some((unit) => unit.id === "truth-armada") ? old : [...old, { id: "truth-armada", name: "Truth's Loyalist Armada", definitionId: "covenant-fleet", domain: "space", locationId: "voi", lat: -3.3961, lng: 38.5561, strength: 100, attack: 140, defense: 118, speed: 84, experience: 92, hostile: true }]);
      outcome = readiness >= 140 ? "Altered outcome: Voi's defenses delay excavation and preserve more of the African theater, but the Dreadnought still reaches the Portal." : "Truth concentrates overwhelming force at Voi. The Portal event remains extremely difficult to alter.";
    }
    setFiredEvents((old) => [...old, event.id]);
    setNews({ event, outcome });
    addLog(`${event.title}: ${outcome}`, event.hardToAlter ? "danger" : "warn", Date.parse(event.date));
  }

  function finishQueueItem(item: QueueItem) {
    const target = EARTH_LOCATIONS.find((location) => location.id === item.targetId) || EARTH_LOCATIONS[0];
    const definition = UNIT_DEFINITIONS.find((unit) => unit.id === item.definitionId);
    const custom = item.customStats;
    if (!definition && !custom) return;
    const name = item.customName || definition?.name || "Custom Unit";
    const domain = custom?.domain || definition?.domain || "ground";
    const attack = custom?.attack || definition?.attack || 40;
    const defense = custom?.defense || definition?.defense || 40;
    const moveSpeed = custom?.speed || definition?.speed || 40;
    setUnits((old) => [...old, {
      id: uid("unit"), name, definitionId: item.definitionId, domain, locationId: target.id,
      lat: target.lat + (Math.random() - 0.5) * 0.35, lng: target.lng + (Math.random() - 0.5) * 0.35,
      strength: 100, attack, defense, speed: moveSpeed, experience: 0,
    }]);
    addLog(`${name} completed and deployed to ${target.name}.`, "good");
  }

  function queueUnit(definition: UnitDefinition, targetId = selected.id) {
    if (resources.credits < definition.credits || resources.materials < definition.materials || resources.manpower < definition.manpower) {
      addLog(`Insufficient resources for ${definition.name}.`, "warn");
      return;
    }
    setResources((old) => ({ ...old, credits: old.credits - definition.credits, materials: old.materials - definition.materials, manpower: old.manpower - definition.manpower }));
    setQueue((old) => [...old, { id: uid("queue"), definitionId: definition.id, targetId, progress: 0, required: definition.buildHours }]);
    addLog(`${definition.name} entered production for ${EARTH_LOCATIONS.find((item) => item.id === targetId)?.name || "Earth"}.`, "info");
  }

  function queueTemplate(template: Template) {
    if (resources.credits < template.credits || resources.materials < template.materials || resources.manpower < template.manpower) {
      addLog(`Insufficient resources for ${template.name}.`, "warn");
      return;
    }
    setResources((old) => ({ ...old, credits: old.credits - template.credits, materials: old.materials - template.materials, manpower: old.manpower - template.manpower }));
    setQueue((old) => [...old, { id: uid("queue"), definitionId: `template:${template.id}`, targetId: selected.id, progress: 0, required: template.hours, customName: template.name, customStats: { domain: template.air > template.infantry + template.armor ? "air" : "ground", attack: template.attack, defense: template.defense, speed: template.speed } }]);
    addLog(`${template.name} custom template entered production.`, "info");
  }

  function startResearch(id: string) {
    const item = RESEARCH.find((research) => research.id === id);
    if (!item || completedResearch.includes(id) || activeResearch) return;
    if (resources.credits < item.cost) { addLog(`Insufficient credits for ${item.name}.`, "warn"); return; }
    setResources((old) => ({ ...old, credits: old.credits - item.cost }));
    setActiveResearch({ id, progress: 0 });
    addLog(`Research started: ${item.name}.`, "info");
  }

  function fortifySelected() {
    if (resources.credits < 30 || resources.materials < 25) { addLog("Fortification requires 30 cR and 25 materials.", "warn"); return; }
    setResources((old) => ({ ...old, credits: old.credits - 30, materials: old.materials - 25 }));
    setLocationState((old) => ({ ...old, [selected.id]: { ...old[selected.id], defense: clamp(old[selected.id].defense + 12, 0, 150), supply: clamp(old[selected.id].supply + 8) } }));
    addLog(`${selected.name} fortified. Defense and supply increased.`, "good");
  }

  function repairSelected() {
    if (resources.credits < 24 || resources.materials < 30) { addLog("Repair requires 24 cR and 30 materials.", "warn"); return; }
    setResources((old) => ({ ...old, credits: old.credits - 24, materials: old.materials - 30 }));
    setLocationState((old) => ({ ...old, [selected.id]: { ...old[selected.id], integrity: clamp(old[selected.id].integrity + 16), supply: clamp(old[selected.id].supply + 5) } }));
    addLog(`${selected.name} emergency repairs completed.`, "good");
  }

  function moveSelectedUnit() {
    if (!selectedUnit || selectedUnit.hostile) return;
    setUnits((old) => old.map((unit) => unit.id === selectedUnit.id ? { ...unit, locationId: selected.id, lat: selected.lat + (Math.random() - 0.5) * 0.18, lng: selected.lng + (Math.random() - 0.5) * 0.18 } : unit));
    addLog(`${selectedUnit.name} redeployed to ${selected.name}.`, "info");
  }

  function diplomaticAction(factionId: string) {
    if (resources.intel < 10 || resources.credits < 8) { addLog("Diplomatic mission requires 10 intel and 8 cR.", "warn"); return; }
    if (factionId === "covenant") { addLog("Covenant loyalists reject negotiation. Total war remains in effect.", "danger"); return; }
    setResources((old) => ({ ...old, intel: old.intel - 10, credits: old.credits - 8 }));
    setDiplomacy((old) => ({ ...old, [factionId]: clamp((old[factionId] || 0) + (factionId === "sangheili" && firedEvents.includes("great-schism") ? 18 : 7), -100, 100) }));
    addLog(`Diplomatic mission sent to ${DIPLOMACY_FACTIONS.find((item) => item.id === factionId)?.name}.`, "good");
  }

  function saveTemplate() {
    const p = templateParts;
    const total = p.infantry + p.armor + p.air + p.artillery + p.logistics;
    if (!templateName.trim() || total <= 0) return;
    const template: Template = {
      id: uid("template"), name: templateName.trim(), ...p,
      attack: Math.round(p.infantry * 6 + p.armor * 13 + p.air * 14 + p.artillery * 10 + p.logistics * 2),
      defense: Math.round(p.infantry * 8 + p.armor * 12 + p.air * 4 + p.artillery * 5 + p.logistics * 8),
      speed: Math.round(clamp(35 + p.air * 5 + p.logistics * 3 - p.artillery * 2 - p.armor, 20, 95)),
      credits: Math.round(22 + total * 7 + p.air * 8 + p.armor * 5),
      materials: Math.round(18 + total * 6 + p.armor * 9 + p.artillery * 4),
      manpower: Math.round(8 + p.infantry * 5 + p.armor * 2 + p.logistics * 2),
      hours: Math.round(48 + total * 8 + p.air * 10 + p.armor * 8),
    };
    setTemplates((old) => [...old, template]);
    addLog(`Custom unit template saved: ${template.name}.`, "good");
  }

  function exportSave() {
    const save: SaveData = { version: 1, gameTime, speed, resources, locationState, units, queue, activeResearch, completedResearch, firedEvents, diplomacy, templates, log };
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `halo-earth-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importSave(file: File) {
    try {
      const data = JSON.parse(await file.text()) as SaveData;
      if (data.version !== 1) throw new Error("Unsupported save version");
      setGameTime(data.gameTime); setSpeed(0); setResources(data.resources); setLocationState(data.locationState); setUnits(data.units); setQueue(data.queue); setActiveResearch(data.activeResearch); setCompletedResearch(data.completedResearch); setFiredEvents(data.firedEvents); setDiplomacy(data.diplomacy); setTemplates(data.templates); setLog(data.log);
      addLog("External save imported successfully.", "good", data.gameTime);
    } catch { addLog("Save import failed. The file is invalid or incompatible.", "danger"); }
  }

  function resetCampaign() {
    localStorage.removeItem(SAVE_KEY);
    setGameTime(START_TIME); setSpeed(0); setResources({ credits: 840, materials: 720, energy: 92, food: 88, intel: 74, manpower: 640 }); setLocationState(initialLocationState()); setUnits(initialUnits()); setQueue([]); setActiveResearch(null); setCompletedResearch([]); setFiredEvents([]); setDiplomacy(initialDiplomacy()); setTemplates([]); setLog([makeLog("Campaign reset to October 19, 2552.", START_TIME, "info")]); setNews(null);
  }

  const templatePreview = useMemo(() => {
    const p = templateParts;
    return {
      attack: Math.round(p.infantry * 6 + p.armor * 13 + p.air * 14 + p.artillery * 10 + p.logistics * 2),
      defense: Math.round(p.infantry * 8 + p.armor * 12 + p.air * 4 + p.artillery * 5 + p.logistics * 8),
      speed: Math.round(clamp(35 + p.air * 5 + p.logistics * 3 - p.artillery * 2 - p.armor, 20, 95)),
    };
  }, [templateParts]);

  return (
    <div className="halo-game-shell stack">
      <section className="halo-command-header">
        <div>
          <p className="halo-eyebrow">UNSC HIGHCOM // EARTH DEFENSE SIMULATION</p>
          <h1>HALO: EARTH COMMAND</h1>
          <p className="muted">Earth-first grand strategy prototype for {username}. Canon facts are marked separately from conservative extrapolation.</p>
        </div>
        <div className="halo-time-console">
          <strong>{formatGameTime(gameTime)}</strong>
          <div className="row">
            {SPEEDS.map((value) => <button type="button" key={value} className={speed === value ? "active" : ""} onClick={() => setSpeed(value)}>{value === 0 ? "Ⅱ" : `${value}H/S`}</button>)}
          </div>
        </div>
      </section>

      <section className="halo-resource-strip">
        <div><span>cR</span><strong>{Math.floor(resources.credits)}</strong><small>+18/day</small></div>
        <div><span>MATERIAL</span><strong>{Math.floor(resources.materials)}</strong><small>+13/day</small></div>
        <div><span>ENERGY</span><strong>{resources.energy.toFixed(0)}%</strong><small>grid</small></div>
        <div><span>FOOD</span><strong>{resources.food.toFixed(0)}%</strong><small>reserve</small></div>
        <div><span>INTEL</span><strong>{resources.intel.toFixed(0)}%</strong><small>+0.9/day</small></div>
        <div><span>MANPOWER</span><strong>{Math.floor(resources.manpower)}K</strong><small>available</small></div>
        <div><span>EARTH</span><strong>{overall.integrity.toFixed(0)}%</strong><small>{overall.contested} contested</small></div>
        <div><span>ORBIT</span><strong>{overall.orbital.toFixed(0)}%</strong><small>grid integrity</small></div>
      </section>

      <section className="halo-command-tabs spread">
        <div className="row">
          {(["strategic", "surface", "orbit", "system"] as MapMode[]).map((mode) => <button type="button" key={mode} className={mapMode === mode ? "active" : ""} onClick={() => setMapMode(mode)}>{mode}</button>)}
        </div>
        <div className="row">
          <button type="button" onClick={exportSave}>export save</button>
          <button type="button" onClick={() => importRef.current?.click()}>import</button>
          <button type="button" className="danger" onClick={resetCampaign}>reset</button>
          <input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSave(file); event.target.value = ""; }} />
        </div>
      </section>

      {mapMode === "strategic" && <StrategicEarthMap locations={EARTH_LOCATIONS} units={mapUnits} selected={selected} onSelect={(location) => setSelectedId(location.id)} />}
      {mapMode === "surface" && <SurfaceEarthMap locations={EARTH_LOCATIONS} units={mapUnits} selected={selected} onSelect={(location) => setSelectedId(location.id)} />}
      {mapMode === "orbit" && <OrbitalEarthMap locations={EARTH_LOCATIONS} units={mapUnits} selected={selected} onSelect={(location) => setSelectedId(location.id)} />}
      {mapMode === "system" && <SolarSystemView />}

      <section className="halo-lower-layout">
        <aside className="halo-location-intel stack">
          <div className="spread"><span className={`halo-confidence ${selected.confidence}`}>{selected.confidence}</span><span className={`halo-control ${selectedState.control.toLowerCase()}`}>{selectedState.control}</span></div>
          <div><p className="halo-eyebrow">SELECTED LOCATION</p><h2>{selected.name}</h2><p className="muted">{selected.region} · {selected.country}</p></div>
          <p>{selected.description}</p>
          <p className="small muted">{selected.canonNote}</p>
          <div className="halo-stat-bars">
            <label>DEFENSE <span>{Math.round(selectedState.defense + (deployedDefenseByLocation[selected.id] || 0))}</span><i><b style={{ width: `${clamp((selectedState.defense + (deployedDefenseByLocation[selected.id] || 0)) / 1.5)}%` }} /></i></label>
            <label>INTEGRITY <span>{selectedState.integrity.toFixed(0)}%</span><i><b style={{ width: `${selectedState.integrity}%` }} /></i></label>
            <label>SUPPLY <span>{selectedState.supply.toFixed(0)}%</span><i><b style={{ width: `${selectedState.supply}%` }} /></i></label>
            <label>THREAT <span>{selected.threat}</span><i className="danger"><b style={{ width: `${selected.threat}%` }} /></i></label>
          </div>
          <div className="grid halo-location-metrics"><div><span>INDUSTRY</span><strong>{selected.industry}</strong></div><div><span>POPULATION</span><strong>{selected.population}</strong></div><div><span>IMPORTANCE</span><strong>{selected.importance}</strong></div><div><span>COORDS</span><strong>{selected.lat.toFixed(2)}, {selected.lng.toFixed(2)}</strong></div></div>
          <div className="row"><button type="button" onClick={fortifySelected}>fortify</button><button type="button" onClick={repairSelected}>repair</button><button type="button" onClick={() => setMapMode("surface")}>surface view</button></div>
          {selectedUnit && !selectedUnit.hostile && <button type="button" onClick={moveSelectedUnit}>redeploy {selectedUnit.name} here</button>}
        </aside>

        <div className="halo-operations stack">
          <nav className="halo-panel-tabs">
            {(["command", "forces", "production", "research", "diplomacy", "templates", "lore", "events"] as PanelMode[]).map((mode) => <button type="button" key={mode} className={panel === mode ? "active" : ""} onClick={() => setPanel(mode)}>{mode}</button>)}
          </nav>

          {panel === "command" && <div className="stack">
            <div className="halo-dashboard-grid">
              <article className="halo-data-card"><span>NEXT CANON PRESSURE</span><h3>{nextEvent?.title || "TIMELINE COMPLETE"}</h3><p>{nextEvent ? formatGameTime(Date.parse(nextEvent.date)) : "No queued event"}</p><strong>{nextEvent?.hardToAlter ? "HARD TO ALTER" : "ALTERABLE"}</strong></article>
              <article className="halo-data-card"><span>ACTIVE RESEARCH</span><h3>{activeResearch ? RESEARCH.find((item) => item.id === activeResearch.id)?.name : "NONE"}</h3><p>{activeResearch ? `${activeResearch.progress.toFixed(0)} / ${RESEARCH.find((item) => item.id === activeResearch.id)?.hours} hours` : "Open research and select a project."}</p></article>
              <article className="halo-data-card"><span>MANUFACTURING</span><h3>{queue.length} QUEUED</h3><p>{queue[0] ? `${Math.min(100, queue[0].progress / queue[0].required * 100).toFixed(0)}% ${queue[0].customName || UNIT_DEFINITIONS.find((item) => item.id === queue[0].definitionId)?.name}` : "Factories available."}</p></article>
              <article className="halo-data-card"><span>FORCES</span><h3>{units.filter((unit) => !unit.hostile).length} FRIENDLY / {units.filter((unit) => unit.hostile).length} HOSTILE</h3><p>{units.filter((unit) => unit.locationId === selected.id).length} units in selected sector.</p></article>
            </div>
            <div className="halo-log-list">{log.slice(0, 12).map((entry) => <div key={entry.id} className={entry.kind}><time>{formatGameTime(entry.time)}</time><p>{entry.text}</p></div>)}</div>
          </div>}

          {panel === "forces" && <div className="stack">
            <div className="spread"><div><h2>Deployed forces</h2><p className="muted">Select a friendly unit, choose a location on any map, then redeploy it.</p></div><span className="badge">REAL-TIME STRENGTH</span></div>
            <div className="halo-unit-grid">{units.map((unit) => {
              const location = EARTH_LOCATIONS.find((item) => item.id === unit.locationId);
              return <button type="button" key={unit.id} className={`halo-unit-card ${unit.hostile ? "hostile" : "friendly"} ${selectedUnitId === unit.id ? "active" : ""}`} onClick={() => { setSelectedUnitId(unit.id); if (location) setSelectedId(location.id); }}>
                <span>{unit.hostile ? "HOSTILE" : unit.domain.toUpperCase()}</span><h3>{unit.name}</h3><p>{location?.name || "Orbit"}</p><div className="halo-unit-stats"><b>STR {unit.strength.toFixed(0)}</b><b>ATK {unit.attack + globalAttackBonus}</b><b>DEF {unit.defense}</b><b>EXP {unit.experience}</b></div>
              </button>;
            })}</div>
          </div>}

          {panel === "production" && <div className="stack">
            <div><h2>Manufacturing and deployment</h2><p className="muted">New formations deploy to {selected.name}. Production continues while time runs.</p></div>
            {queue.length > 0 && <div className="halo-queue-list">{queue.map((item) => { const definition = UNIT_DEFINITIONS.find((unit) => unit.id === item.definitionId); return <div key={item.id}><span>{item.customName || definition?.name}</span><i><b style={{ width: `${Math.min(100, item.progress / item.required * 100)}%` }} /></i><small>{item.progress.toFixed(0)} / {item.required} hours</small></div>; })}</div>}
            <div className="halo-production-grid">{UNIT_DEFINITIONS.map((definition) => <article key={definition.id} className="halo-production-card"><div className="spread"><span className="badge">{definition.domain}</span><strong>{definition.buildHours}H</strong></div><h3>{definition.name}</h3><p className="muted">{definition.description}</p><div className="halo-cost-row"><span>{definition.credits} cR</span><span>{definition.materials} MAT</span><span>{definition.manpower}K MP</span></div><div className="halo-unit-stats"><b>ATK {definition.attack}</b><b>DEF {definition.defense}</b><b>SPD {definition.speed}</b></div><button type="button" onClick={() => queueUnit(definition)}>build for {selected.name}</button></article>)}</div>
          </div>}

          {panel === "research" && <div className="stack">
            <div><h2>Research directorate</h2><p className="muted">One project at a time. Completed technology permanently affects the campaign.</p></div>
            <div className="halo-research-grid">{RESEARCH.map((item) => {
              const active = activeResearch?.id === item.id;
              const done = completedResearch.includes(item.id);
              return <article key={item.id} className={`halo-research-card ${active ? "active" : ""} ${done ? "done" : ""}`}><div className="spread"><span className="badge">{done ? "COMPLETE" : active ? "ACTIVE" : `${item.hours}H`}</span><strong>{item.cost} cR</strong></div><h3>{item.name}</h3><p>{item.description}</p><p className="halo-effect">{item.effect}</p>{active && <div className="halo-progress"><b style={{ width: `${Math.min(100, activeResearch.progress / item.hours * 100)}%` }} /></div>}<button type="button" disabled={done || Boolean(activeResearch)} onClick={() => startResearch(item.id)}>{done ? "completed" : active ? `${activeResearch.progress.toFixed(0)} / ${item.hours}` : "start research"}</button></article>;
            })}</div>
          </div>}

          {panel === "diplomacy" && <div className="stack">
            <div><h2>Diplomacy and inter-faction relations</h2><p className="muted">Relations can change the difficulty of canon events but cannot make Covenant loyalists peaceful.</p></div>
            <div className="halo-diplomacy-list">{DIPLOMACY_FACTIONS.map((faction) => { const relation = diplomacy[faction.id] ?? faction.relation; return <article key={faction.id}><div><span className="badge">{faction.status}</span><h3>{faction.name}</h3></div><div className="halo-relation"><strong>{relation}</strong><i><b style={{ width: `${(relation + 100) / 2}%` }} /></i></div><button type="button" disabled={faction.id === "ueg" || faction.id === "unsc"} onClick={() => diplomaticAction(faction.id)}>send mission</button></article>; })}</div>
          </div>}

          {panel === "templates" && <div className="stack">
            <div><h2>Custom unit templates</h2><p className="muted">Combine infantry, armor, air, artillery and logistics. Larger formations cost more and take longer.</p></div>
            <div className="halo-template-builder">
              <label>Template name<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={50} /></label>
              {(Object.keys(templateParts) as Array<keyof typeof templateParts>).map((key) => <label key={key}>{key.toUpperCase()} <span>{templateParts[key]}</span><input type="range" min="0" max="8" value={templateParts[key]} onChange={(event) => setTemplateParts((old) => ({ ...old, [key]: Number(event.target.value) }))} /></label>)}
              <div className="halo-template-preview"><strong>ATK {templatePreview.attack}</strong><strong>DEF {templatePreview.defense}</strong><strong>SPD {templatePreview.speed}</strong></div>
              <button type="button" onClick={saveTemplate}>save template</button>
            </div>
            <div className="halo-production-grid">{templates.map((template) => <article key={template.id} className="halo-production-card"><span className="badge">CUSTOM</span><h3>{template.name}</h3><p className="muted">INF {template.infantry} · ARM {template.armor} · AIR {template.air} · ART {template.artillery} · LOG {template.logistics}</p><div className="halo-cost-row"><span>{template.credits} cR</span><span>{template.materials} MAT</span><span>{template.manpower}K MP</span></div><div className="halo-unit-stats"><b>ATK {template.attack}</b><b>DEF {template.defense}</b><b>SPD {template.speed}</b></div><button type="button" onClick={() => queueTemplate(template)}>build for {selected.name}</button></article>)}</div>
          </div>}

          {panel === "lore" && <div className="stack">
            <div><h2>Earth lore and extrapolation database</h2><p className="muted">Canon means directly supported. Canon-inferred uses a known place with approximate mapping. Speculative fills gaps without pretending to be official lore.</p></div>
            <div className="halo-lore-list">{EARTH_LOCATIONS.map((location) => <button type="button" key={location.id} onClick={() => { setSelectedId(location.id); setMapMode("surface"); }}><span className={`halo-confidence ${location.confidence}`}>{location.confidence}</span><div><h3>{location.name}</h3><p>{location.canonNote}</p></div><strong>{location.importance}</strong></button>)}</div>
          </div>}

          {panel === "events" && <div className="stack">
            <div><h2>Canon event timeline</h2><p className="muted">Strong preparation can change losses and local control. Core events tied to the Ark Portal and major Halo 2/3 chronology remain intentionally difficult to erase.</p></div>
            <div className="halo-event-list">{CANON_EVENTS.map((event) => <article key={event.id} className={firedEvents.includes(event.id) ? "fired" : "pending"}><time>{formatGameTime(Date.parse(event.date))}</time><div><h3>{event.title}</h3><p>{event.body}</p></div><span>{firedEvents.includes(event.id) ? "FIRED" : event.hardToAlter ? "HARD CANON" : "ALTERABLE"}</span></article>)}</div>
          </div>}
        </div>
      </section>

      <section className="halo-disclaimer"><strong>FAN-MADE PROTOTYPE</strong><span>Uses no Halo art or game assets. Map detail comes from OpenStreetMap. Halo names and lore belong to Microsoft/Halo Studios. This module separates sourced canon from original extrapolation.</span></section>

      {news && <div className="halo-news-backdrop" role="dialog" aria-modal="true" aria-label={news.event.title}>
        <article className="halo-news-modal">
          <p className="halo-news-kicker">SPECIAL BULLETIN // {formatGameTime(Date.parse(news.event.date))}</p>
          <h2>{news.event.title}</h2>
          <p>{news.event.body}</p>
          <hr />
          <h3>Campaign outcome</h3>
          <p>{news.outcome}</p>
          <div className="row"><button type="button" onClick={() => { if (news.event.locationId) { setSelectedId(news.event.locationId); setMapMode("strategic"); } setNews(null); }}>open theater</button><button type="button" onClick={() => setNews(null)}>continue</button></div>
        </article>
      </div>}
    </div>
  );
}
