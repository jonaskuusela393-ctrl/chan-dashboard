export type SiteKind = "starter" | "business" | "booking" | "catalog" | "commerce" | "custom";
export type CarePlan = "handoff" | "care" | "managed" | "growth";

export type EstimateInput = {
  siteKind: SiteKind;
  pages: number;
  extraLanguages: number;
  features: string[];
  carePlan: CarePlan;
  urgent: boolean;
};

export type EstimateResult = {
  setupBase: number;
  setupLow: number;
  setupHigh: number;
  monthly: number;
  deliveryWeeks: string;
  included: string[];
  assumptions: string[];
};

export const SITE_KINDS: Array<{ value: SiteKind; label: string; description: string; price: number; includedPages: number; weeks: [number, number] }> = [
  { value: "starter", label: "Simple one-page site", description: "A focused landing page for a small local business.", price: 690, includedPages: 1, weeks: [1, 2] },
  { value: "business", label: "Complete business website", description: "Home, services, about, contact and essential legal pages.", price: 1190, includedPages: 5, weeks: [2, 4] },
  { value: "booking", label: "Service site with booking", description: "A complete business site with appointment or quote flow.", price: 1590, includedPages: 6, weeks: [3, 5] },
  { value: "catalog", label: "Large service or product catalogue", description: "Many services, locations, products or project pages.", price: 2090, includedPages: 10, weeks: [4, 7] },
  { value: "commerce", label: "Online shop", description: "Products, checkout integration and store setup.", price: 2890, includedPages: 8, weeks: [5, 9] },
  { value: "custom", label: "Custom web application", description: "Accounts, dashboards, workflows or database-backed tools.", price: 3490, includedPages: 6, weeks: [6, 12] },
];

export const FEATURE_OPTIONS = [
  { value: "copy", label: "Professional copywriting", price: 240 },
  { value: "branding", label: "Logo and visual identity cleanup", price: 320 },
  { value: "gallery", label: "Project gallery / before-and-after", price: 160 },
  { value: "reviews", label: "Google reviews integration", price: 120 },
  { value: "seo", label: "Advanced local SEO setup", price: 390 },
  { value: "cms", label: "Editable news/blog content", price: 420 },
  { value: "booking", label: "Booking or calendar integration", price: 480 },
  { value: "database", label: "Database-backed forms or records", price: 490 },
  { value: "accounts", label: "Customer accounts / private portal", price: 990 },
  { value: "payments", label: "Online payment integration", price: 790 },
  { value: "migration", label: "Move content from an old website", price: 240 },
  { value: "analytics", label: "Analytics and conversion tracking", price: 110 },
] as const;

export const CARE_PLANS: Array<{ value: CarePlan; label: string; monthly: number; description: string }> = [
  { value: "handoff", label: "Handoff", monthly: 0, description: "You own the accounts and request updates when needed." },
  { value: "care", label: "Care", monthly: 49, description: "Monitoring, backups and small technical fixes." },
  { value: "managed", label: "Managed", monthly: 99, description: "Care plan plus regular text/image updates." },
  { value: "growth", label: "Growth", monthly: 179, description: "Managed service plus monthly SEO and conversion work." },
];

function whole(value: unknown, minimum: number, maximum: number) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : minimum;
}

export function normalizeEstimateInput(input: Partial<EstimateInput>): EstimateInput {
  const kind = SITE_KINDS.some((item) => item.value === input.siteKind) ? input.siteKind as SiteKind : "business";
  const care = CARE_PLANS.some((item) => item.value === input.carePlan) ? input.carePlan as CarePlan : "managed";
  const validFeatures = new Set(FEATURE_OPTIONS.map((item) => item.value));
  return {
    siteKind: kind,
    pages: whole(input.pages, 1, 60),
    extraLanguages: whole(input.extraLanguages, 0, 5),
    features: Array.from(new Set(Array.isArray(input.features) ? input.features.filter((item) => validFeatures.has(item as typeof FEATURE_OPTIONS[number]["value"])) : [])).slice(0, FEATURE_OPTIONS.length),
    carePlan: care,
    urgent: Boolean(input.urgent),
  };
}

export function calculateEstimate(raw: Partial<EstimateInput>): EstimateResult {
  const input = normalizeEstimateInput(raw);
  const kind = SITE_KINDS.find((item) => item.value === input.siteKind) || SITE_KINDS[1];
  const care = CARE_PLANS.find((item) => item.value === input.carePlan) || CARE_PLANS[2];
  const extraPages = Math.max(0, input.pages - kind.includedPages);
  const pageCost = extraPages * 95;
  const languageCost = input.extraLanguages * 290;
  const featureCost = FEATURE_OPTIONS.filter((item) => input.features.includes(item.value)).reduce((sum, item) => sum + item.price, 0);
  let setupBase = kind.price + pageCost + languageCost + featureCost;
  if (input.urgent) setupBase *= 1.25;
  setupBase = Math.round(setupBase / 10) * 10;

  const low = Math.max(390, Math.round((setupBase * 0.9) / 10) * 10);
  const high = Math.round((setupBase * 1.2) / 10) * 10;
  const minWeeks = input.urgent ? Math.max(1, kind.weeks[0] - 1) : kind.weeks[0];
  const maxWeeks = input.urgent ? Math.max(minWeeks + 1, kind.weeks[1] - 1) : kind.weeks[1];

  return {
    setupBase,
    setupLow: low,
    setupHigh: high,
    monthly: care.monthly,
    deliveryWeeks: `${minWeeks}–${maxWeeks} weeks`,
    included: [
      "Responsive desktop and mobile design",
      "Vercel deployment and domain connection",
      "Contact forms and basic search setup",
      "HTTPS, performance and accessibility checks",
      "Two revision rounds before launch",
    ],
    assumptions: [
      "This is an initial non-binding estimate, not a final quote.",
      "Third-party fees such as domains, paid email, booking, SMS or payment processing are billed separately.",
      "A normal brochure website usually does not need a database. Neon is added only when the site stores dynamic data.",
    ],
  };
}

export function euro(value: number) {
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}
