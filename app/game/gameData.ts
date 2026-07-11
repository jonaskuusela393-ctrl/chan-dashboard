export type LoreConfidence = "canon" | "canon-inferred" | "speculative";
export type Domain = "ground" | "air" | "naval" | "orbit" | "space";

export type EarthLocation = {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  kind: "city" | "military" | "tether" | "industrial" | "forerunner" | "orbital";
  confidence: LoreConfidence;
  importance: number;
  industry: number;
  population: number;
  defense: number;
  threat: number;
  description: string;
  canonNote: string;
};

export const EARTH_LOCATIONS: EarthLocation[] = [
  {
    id: "new-mombasa",
    name: "New Mombasa",
    region: "East African Protectorate",
    country: "Kenya",
    lat: -4.0435,
    lng: 39.6682,
    kind: "tether",
    confidence: "canon",
    importance: 100,
    industry: 92,
    population: 78,
    defense: 52,
    threat: 95,
    description: "Humanity's first tether city, a major port and industrial center surrounding the Mombasa orbital elevator.",
    canonNote: "Canon: New Mombasa, the Mombasa Tether, the Superintendent, artificial harbor works and the 2552 Covenant assault.",
  },
  {
    id: "old-mombasa",
    name: "Old Mombasa",
    region: "East African Protectorate",
    country: "Kenya",
    lat: -4.0503,
    lng: 39.6512,
    kind: "city",
    confidence: "canon",
    importance: 72,
    industry: 45,
    population: 66,
    defense: 48,
    threat: 86,
    description: "The historic mainland districts surrounding the newer island metropolis.",
    canonNote: "Canon battlefield in Halo 2, preserving older urban fabric beside New Mombasa.",
  },
  {
    id: "uplift-reserve",
    name: "Uplift Nature Reserve",
    region: "Mombasa Sector 9",
    country: "Kenya",
    lat: -4.087,
    lng: 39.647,
    kind: "industrial",
    confidence: "canon-inferred",
    importance: 58,
    industry: 28,
    population: 18,
    defense: 36,
    threat: 82,
    description: "Artificial-island reserve, transit complex and civic infrastructure southwest of New Mombasa.",
    canonNote: "Canon location; map coordinate is an approximation aligned to real Mombasa geography.",
  },
  {
    id: "oni-alpha",
    name: "ONI Alpha Site",
    region: "New Mombasa Sector 10",
    country: "Kenya",
    lat: -4.066,
    lng: 39.695,
    kind: "forerunner",
    confidence: "canon-inferred",
    importance: 94,
    industry: 40,
    population: 8,
    defense: 84,
    threat: 96,
    description: "Fortified ONI intelligence complex built above data connected to the buried Forerunner artifact.",
    canonNote: "Canon site; exact real-world coordinate is intentionally approximate.",
  },
  {
    id: "voi",
    name: "Voi / Portal Excession",
    region: "East African Protectorate",
    country: "Kenya",
    lat: -3.3961,
    lng: 38.5561,
    kind: "forerunner",
    confidence: "canon",
    importance: 100,
    industry: 52,
    population: 31,
    defense: 38,
    threat: 100,
    description: "Industrial city beside the buried Portal to the Ark, the strategic center of Truth's late-2552 campaign.",
    canonNote: "Canon location and central objective of the Covenant excavation.",
  },
  {
    id: "tsavo",
    name: "Tsavo Highway Corridor",
    region: "East African Protectorate",
    country: "Kenya",
    lat: -3.35,
    lng: 38.41,
    kind: "military",
    confidence: "canon-inferred",
    importance: 74,
    industry: 36,
    population: 24,
    defense: 44,
    threat: 92,
    description: "Strategic transport corridor linking coastal defense, Voi and the Portal battlefield.",
    canonNote: "Canon campaign area; exact strategic footprint is inferred from real geography and game spaces.",
  },
  {
    id: "sydney-highcom",
    name: "Sydney HIGHCOM / The Hive",
    region: "UEG Capital District",
    country: "Australia",
    lat: -33.8688,
    lng: 151.2093,
    kind: "military",
    confidence: "canon",
    importance: 100,
    industry: 88,
    population: 92,
    defense: 96,
    threat: 75,
    description: "Capital of the UEG and home of UNSC HIGHCOM Facility Bravo-6, extending kilometers underground.",
    canonNote: "Canon UEG and UNSC headquarters in Sydney.",
  },
  {
    id: "quito-tether",
    name: "Quito Space Tether",
    region: "South American Protectorate",
    country: "Ecuador",
    lat: -0.1807,
    lng: -78.4678,
    kind: "tether",
    confidence: "canon",
    importance: 94,
    industry: 86,
    population: 72,
    defense: 74,
    threat: 60,
    description: "One of Earth's six tethers and a major passenger, cargo and military route to orbit.",
    canonNote: "Canon tether city. The upper terminus is represented separately in orbit view.",
  },
  {
    id: "havana-elevator",
    name: "Havana Centennial Elevator",
    region: "Caribbean Protectorate",
    country: "Cuba",
    lat: 23.1136,
    lng: -82.3666,
    kind: "tether",
    confidence: "canon",
    importance: 88,
    industry: 82,
    population: 70,
    defense: 68,
    threat: 78,
    description: "Orbital elevator and major logistics target during Blue Team's defense of Earth.",
    canonNote: "Canon: the Centennial Orbital Elevator was fought over and destroyed during the Battle for Earth.",
  },
  {
    id: "cleveland",
    name: "Cleveland",
    region: "United Republic of North America",
    country: "United States",
    lat: 41.4993,
    lng: -81.6944,
    kind: "city",
    confidence: "canon",
    importance: 72,
    industry: 68,
    population: 64,
    defense: 55,
    threat: 72,
    description: "North American industrial city attacked by Covenant forces searching for a supposed Forerunner artifact.",
    canonNote: "Canon Battle for Earth target.",
  },
  {
    id: "new-phoenix",
    name: "New Phoenix",
    region: "United Republic of North America",
    country: "United States",
    lat: 33.4484,
    lng: -112.074,
    kind: "city",
    confidence: "canon",
    importance: 84,
    industry: 80,
    population: 82,
    defense: 61,
    threat: 35,
    description: "Large 26th-century city later targeted by the Composer in 2557.",
    canonNote: "Canon city; the campaign begins five years before the Composer event.",
  },
  {
    id: "london",
    name: "London",
    region: "European Protectorate",
    country: "United Kingdom",
    lat: 51.5072,
    lng: -0.1276,
    kind: "city",
    confidence: "canon",
    importance: 86,
    industry: 82,
    population: 88,
    defense: 62,
    threat: 76,
    description: "Dense global city occupied by Jiralhanae forces during the Battle for Earth.",
    canonNote: "Canon Covenant occupation beginning October 22, 2552.",
  },
  {
    id: "chicago",
    name: "Chicago Industrial Zone 08",
    region: "United Republic of North America",
    country: "United States",
    lat: 41.8781,
    lng: -87.6298,
    kind: "industrial",
    confidence: "canon-inferred",
    importance: 78,
    industry: 92,
    population: 79,
    defense: 66,
    threat: 52,
    description: "Heavy industrial and autonomous-defense development zone supporting Earth war production.",
    canonNote: "Canon Chicago test grounds exist; broader 2552 industrial role is inferred.",
  },
  {
    id: "new-york",
    name: "New York Megalopolis",
    region: "United Republic of North America",
    country: "United States",
    lat: 40.7128,
    lng: -74.006,
    kind: "city",
    confidence: "speculative",
    importance: 92,
    industry: 90,
    population: 96,
    defense: 74,
    threat: 63,
    description: "A vast Atlantic economic and diplomatic center preserving the historic United Nations district.",
    canonNote: "Speculative extension: no canon New York tether is assumed. Its scale and UN legacy are extrapolated conservatively.",
  },
  {
    id: "helsinki",
    name: "Helsinki Arcology Belt",
    region: "European Protectorate",
    country: "Finland",
    lat: 60.1699,
    lng: 24.9384,
    kind: "city",
    confidence: "speculative",
    importance: 58,
    industry: 66,
    population: 46,
    defense: 61,
    threat: 38,
    description: "Cold-climate coastal arcologies, naval electronics and hardened civil-defense infrastructure around the Gulf of Finland.",
    canonNote: "Speculative, grounded in real geography, regional industry and UNSC-era urban development patterns.",
  },
  {
    id: "tokyo",
    name: "Tokyo-Yokohama Conurbation",
    region: "East Asian Protectorate",
    country: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    kind: "industrial",
    confidence: "speculative",
    importance: 94,
    industry: 98,
    population: 100,
    defense: 78,
    threat: 66,
    description: "Hyper-dense Pacific manufacturing, robotics and aerospace conurbation with layered sea defenses.",
    canonNote: "Speculative but based on the real metropolitan footprint and human 26th-century technology.",
  },
  {
    id: "shanghai",
    name: "Shanghai Orbital Logistics Zone",
    region: "East Asian Protectorate",
    country: "China",
    lat: 31.2304,
    lng: 121.4737,
    kind: "industrial",
    confidence: "speculative",
    importance: 95,
    industry: 100,
    population: 98,
    defense: 76,
    threat: 68,
    description: "Gigantic port, ship-component and logistics region linked to equatorial launch and tether networks.",
    canonNote: "Speculative; no unsupported named tether is added.",
  },
  {
    id: "lagos",
    name: "Lagos Littoral Arcology",
    region: "West African Protectorate",
    country: "Nigeria",
    lat: 6.5244,
    lng: 3.3792,
    kind: "city",
    confidence: "speculative",
    importance: 82,
    industry: 84,
    population: 96,
    defense: 63,
    threat: 54,
    description: "Expanded Atlantic port metropolis with flood-control arcologies and continental freight links.",
    canonNote: "Speculative demographic and infrastructure extrapolation.",
  },
  {
    id: "diego-garcia",
    name: "Diego Garcia UNSC Base",
    region: "Indian Ocean Command",
    country: "British Indian Ocean Territory",
    lat: -7.3195,
    lng: 72.4229,
    kind: "military",
    confidence: "canon",
    importance: 74,
    industry: 45,
    population: 15,
    defense: 82,
    threat: 66,
    description: "Remote UNSC naval and aerospace base that resisted Covenant attack during the Battle for Earth.",
    canonNote: "Canon military target.",
  },
  {
    id: "mount-erebus",
    name: "Mount Erebus Defense Sector",
    region: "Antarctic Protectorate",
    country: "Antarctica",
    lat: -77.53,
    lng: 167.15,
    kind: "military",
    confidence: "canon-inferred",
    importance: 52,
    industry: 25,
    population: 4,
    defense: 72,
    threat: 58,
    description: "Remote polar sensor, research and defense sector attacked during the wider invasion of Earth.",
    canonNote: "Canon attack area; local installation details are inferred.",
  },
];

export type UnitDefinition = {
  id: string;
  name: string;
  domain: Domain;
  credits: number;
  materials: number;
  manpower: number;
  buildHours: number;
  attack: number;
  defense: number;
  speed: number;
  description: string;
};

export const UNIT_DEFINITIONS: UnitDefinition[] = [
  { id: "marine-brigade", name: "UNSC Marine Brigade", domain: "ground", credits: 48, materials: 38, manpower: 32, buildHours: 72, attack: 42, defense: 48, speed: 35, description: "General-purpose mechanized infantry with Pelican support." },
  { id: "odst-group", name: "ODST Rapid Group", domain: "ground", credits: 62, materials: 34, manpower: 18, buildHours: 84, attack: 58, defense: 42, speed: 74, description: "High-readiness orbital insertion force." },
  { id: "armor-battalion", name: "Scorpion Armor Battalion", domain: "ground", credits: 76, materials: 82, manpower: 20, buildHours: 108, attack: 76, defense: 68, speed: 42, description: "Heavy armored formation built around Scorpion tanks." },
  { id: "air-wing", name: "Longsword/Broadsword Wing", domain: "air", credits: 96, materials: 74, manpower: 12, buildHours: 120, attack: 74, defense: 54, speed: 92, description: "Atmospheric and near-orbital strike fighter wing." },
  { id: "naval-group", name: "Maritime Carrier Group", domain: "naval", credits: 86, materials: 88, manpower: 24, buildHours: 144, attack: 60, defense: 72, speed: 52, description: "Ocean control and coastal aerospace support group." },
  { id: "frigate", name: "UNSC Frigate", domain: "space", credits: 210, materials: 190, manpower: 28, buildHours: 360, attack: 86, defense: 72, speed: 78, description: "Compact warship for fleet screening, MAC fire and troop delivery." },
  { id: "odp-cluster", name: "Orbital Defense Platform Cluster", domain: "orbit", credits: 260, materials: 260, manpower: 20, buildHours: 480, attack: 100, defense: 92, speed: 0, description: "Super-MAC defense network protecting a strategic orbital approach." },
];

export type ResearchDefinition = {
  id: string;
  name: string;
  hours: number;
  cost: number;
  description: string;
  effect: string;
};

export const RESEARCH: ResearchDefinition[] = [
  { id: "battle-net", name: "Integrated Battle-Net", hours: 120, cost: 55, description: "Unifies civil sensors, city AIs and UNSC targeting networks.", effect: "+20% research and better event warning" },
  { id: "mac-capacitors", name: "Rapid MAC Capacitors", hours: 180, cost: 80, description: "Improves recharge cycles for orbital and ship-mounted magnetic accelerator cannons.", effect: "+18 orbital attack" },
  { id: "shield-analysis", name: "Covenant Shield Analysis", hours: 240, cost: 95, description: "Applies battlefield telemetry to targeting and ammunition design.", effect: "+15 all attack" },
  { id: "urban-ai", name: "Resilient Urban AI", hours: 150, cost: 65, description: "Hardens Superintendent-class infrastructure against disruption.", effect: "+15 city defense and supply" },
  { id: "slipspace-tracking", name: "Slipspace Wake Tracking", hours: 300, cost: 120, description: "Improves early detection of inbound fleets and local rupture prediction.", effect: "Earlier Covenant alerts" },
  { id: "mjolnir-logistics", name: "MJOLNIR Logistics Cells", hours: 360, cost: 140, description: "Creates rare support chains able to sustain Spartan operations.", effect: "Unlocks Spartan strategic action" },
];

export type CanonEvent = {
  id: string;
  date: string;
  title: string;
  locationId?: string;
  body: string;
  hardToAlter: boolean;
};

export const CANON_EVENTS: CanonEvent[] = [
  { id: "first-contact-earth", date: "2552-10-20T13:01:00Z", title: "COVENANT FLEET DETECTED IN SOL", body: "A Covenant expeditionary force has entered the system near Io. Earth orbital defense moves to full alert.", hardToAlter: true },
  { id: "mombasa-assault", date: "2552-10-20T14:50:00Z", title: "SOLEMN PENANCE OVER MOMBASA", locationId: "new-mombasa", body: "The surviving assault carrier has broken through the orbital grid and deployed troops across Old and New Mombasa.", hardToAlter: true },
  { id: "mombasa-rupture", date: "2552-10-20T16:02:00Z", title: "IN-ATMOSPHERE SLIPSPACE RUPTURE", locationId: "new-mombasa", body: "Regret's carrier initiates a slipspace jump over the city. The rupture devastates the metropolis and exposes the buried Forerunner objective.", hardToAlter: true },
  { id: "london-occupied", date: "2552-10-22T09:00:00Z", title: "LONDON UNDER OCCUPATION", locationId: "london", body: "Jiralhanae forces establish positions across London as the invasion expands beyond East Africa.", hardToAlter: false },
  { id: "great-schism", date: "2552-11-03T12:00:00Z", title: "THE GREAT SCHISM", body: "Covenant forces fracture. Sangheili and Jiralhanae units turn on one another, opening a narrow diplomatic and military opportunity.", hardToAlter: true },
  { id: "truth-arrives", date: "2552-11-17T07:00:00Z", title: "TRUTH'S ARMADA ARRIVES", locationId: "voi", body: "A massive loyalist force concentrates over East Africa. The Forerunner Dreadnought descends toward the Portal excavation at Voi.", hardToAlter: true },
];

export const ORBITAL_NODES = [
  { id: "cairo", name: "Cairo Station", lng: 31.2, lat: 30.0, type: "ODP", defense: 96 },
  { id: "athens", name: "Athens Station", lng: 23.7, lat: 37.9, type: "ODP", defense: 82 },
  { id: "malta", name: "Malta Station", lng: 14.5, lat: 35.9, type: "ODP", defense: 82 },
  { id: "quito-terminus", name: "Quito Terminus", lng: -78.47, lat: -0.18, type: "TETHER", defense: 72 },
  { id: "mombasa-terminus", name: "Mombasa Terminus", lng: 39.67, lat: -4.04, type: "TETHER", defense: 66 },
  { id: "home-fleet", name: "UNSC Home Fleet", lng: -10, lat: 18, type: "FLEET", defense: 88 },
] as const;

export const DIPLOMACY_FACTIONS = [
  { id: "ueg", name: "Unified Earth Government", relation: 100, status: "PLAYER GOVERNMENT" },
  { id: "unsc", name: "United Nations Space Command", relation: 100, status: "EMERGENCY AUTHORITY" },
  { id: "oni", name: "Office of Naval Intelligence", relation: 74, status: "ALLIED / SECRETIVE" },
  { id: "sangheili", name: "Sangheili Separatists", relation: -40, status: "HOSTILE UNTIL SCHISM" },
  { id: "covenant", name: "Covenant Loyalists", relation: -100, status: "TOTAL WAR" },
  { id: "insurrection", name: "Insurrectionist Networks", relation: -25, status: "FRACTURED" },
] as const;
