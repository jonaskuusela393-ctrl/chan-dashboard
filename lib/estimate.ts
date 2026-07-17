export type SiteKind = "starter" | "business" | "booking" | "catalog" | "commerce" | "custom";
export type CarePlan = "handoff" | "care" | "managed" | "growth";
export type PublicLanguage = "en" | "fi";

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
  vatRate: number;
  vatRegistered: boolean;
  setupLowWithVat: number;
  setupHighWithVat: number;
  monthlyWithVat: number;
};

type LocalizedOption = {
  label: string;
  labelFi: string;
  description: string;
  descriptionFi: string;
};

export const SITE_KINDS: Array<LocalizedOption & { value: SiteKind; price: number; includedPages: number; weeks: [number, number] }> = [
  { value: "starter", label: "A simple one-page website", labelFi: "Yksinkertainen yhden sivun verkkosivusto", description: "Best when the business needs a clear introduction, services and contact details on one page.", descriptionFi: "Sopii yritykselle, joka tarvitsee yhdelle sivulle selkeän esittelyn, palvelut ja yhteystiedot.", price: 950, includedPages: 1, weeks: [1, 2] },
  { value: "business", label: "A complete company website", labelFi: "Täydellinen yrityksen verkkosivusto", description: "A normal small-business website with separate pages for services, the company and contact details.", descriptionFi: "Tavallinen pienyrityksen verkkosivusto, jossa palvelut, yritysesittely ja yhteystiedot ovat omilla sivuillaan.", price: 2500, includedPages: 5, weeks: [2, 4] },
  { value: "booking", label: "A company website with booking or quote requests", labelFi: "Yrityssivusto ajanvarauksella tai tarjouspyynnöllä", description: "For businesses that need customers to book a time or send a structured quote request.", descriptionFi: "Yritykselle, joka tarvitsee ajanvarauksen tai selkeän tarjouspyyntölomakkeen.", price: 3500, includedPages: 6, weeks: [3, 5] },
  { value: "catalog", label: "A larger service or product website", labelFi: "Laajempi palvelu- tai tuotesivusto", description: "For many services, locations, projects or products without a full online checkout.", descriptionFi: "Kun palveluita, toimipaikkoja, projekteja tai tuotteita on paljon, mutta verkkokauppaa ei tarvita.", price: 4500, includedPages: 10, weeks: [4, 7] },
  { value: "commerce", label: "An online shop", labelFi: "Verkkokauppa", description: "Products, shopping cart, checkout connection and store setup.", descriptionFi: "Tuotteet, ostoskori, maksaminen ja verkkokaupan käyttöönotto.", price: 6500, includedPages: 8, weeks: [5, 9] },
  { value: "custom", label: "A custom online service", labelFi: "Räätälöity verkkopalvelu", description: "For logins, dashboards, workflows, customer portals or other database-backed functions.", descriptionFi: "Kirjautumisiin, hallintapaneeleihin, työnkulkuihin, asiakasportaaleihin tai muihin tietokantaa käyttäviin toimintoihin.", price: 9000, includedPages: 6, weeks: [6, 12] },
];

export const FEATURE_OPTIONS: Array<LocalizedOption & { value: string; price: number }> = [
  { value: "copy", label: "Help writing all website text", labelFi: "Apua kaikkien verkkosivutekstien kirjoittamiseen", description: "We turn your services and business information into clear customer-facing text.", descriptionFi: "Muotoilemme palvelut ja yrityksen tiedot selkeäksi asiakkaalle sopivaksi tekstiksi.", price: 390 },
  { value: "branding", label: "Logo, colours and visual style", labelFi: "Logo, värit ja visuaalinen ilme", description: "A practical visual identity cleanup for the website.", descriptionFi: "Käytännöllinen visuaalisen ilmeen yhtenäistäminen verkkosivua varten.", price: 490 },
  { value: "gallery", label: "Photos, projects or before-and-after gallery", labelFi: "Kuvat, projektit tai ennen–jälkeen-galleria", description: "A clear gallery for completed work, locations or products.", descriptionFi: "Selkeä galleria tehdyille töille, toimipaikoille tai tuotteille.", price: 240 },
  { value: "reviews", label: "Show customer reviews", labelFi: "Asiakasarvostelujen näyttäminen", description: "Display selected reviews or connect a supported review source.", descriptionFi: "Näytetään valitut arvostelut tai yhdistetään tuettu arvostelupalvelu.", price: 190 },
  { value: "seo", label: "Help appearing in local Google searches", labelFi: "Apua paikallisiin Google-hakuihin", description: "Local search structure, page titles, business details and technical basics.", descriptionFi: "Paikallisen haun rakenne, sivuotsikot, yritystiedot ja tekniset perusteet.", price: 590 },
  { value: "cms", label: "News or articles you can update", labelFi: "Uutiset tai artikkelit, joita voi päivittää", description: "An editable section for news, advice or project updates.", descriptionFi: "Muokattava osio uutisille, neuvoille tai projektipäivityksille.", price: 690 },
  { value: "booking", label: "Appointment booking", labelFi: "Ajanvaraus", description: "Connect an existing calendar/booking service or build a suitable flow.", descriptionFi: "Yhdistetään olemassa oleva kalenteri- tai ajanvarauspalvelu tai rakennetaan sopiva ratkaisu.", price: 690 },
  { value: "database", label: "Save form answers and requests", labelFi: "Lomakevastausten ja pyyntöjen tallennus", description: "Store inquiries safely instead of relying only on email delivery.", descriptionFi: "Tallennetaan yhteydenotot turvallisesti, eikä luoteta vain sähköpostin toimitukseen.", price: 790 },
  { value: "accounts", label: "Private area for the business's customers", labelFi: "Yksityinen alue yrityksen asiakkaille", description: "Customer login, private information or self-service functions.", descriptionFi: "Asiakaskirjautuminen, yksityiset tiedot tai itsepalvelutoiminnot.", price: 1790 },
  { value: "payments", label: "Online payments", labelFi: "Verkkomaksut", description: "Connect a suitable payment provider and checkout flow.", descriptionFi: "Yhdistetään sopiva maksupalvelu ja maksuprosessi.", price: 1190 },
  { value: "migration", label: "Move text and photos from the old website", labelFi: "Vanhan sivuston tekstien ja kuvien siirto", description: "Transfer and clean up existing material supplied by the client.", descriptionFi: "Siirretään ja siistitään asiakkaan toimittama nykyinen sisältö.", price: 390 },
  { value: "analytics", label: "Simple visitor and contact statistics", labelFi: "Selkeät kävijä- ja yhteydenottotilastot", description: "Privacy-conscious measurement of visits and important actions.", descriptionFi: "Tietosuojaystävällinen käyntien ja tärkeiden toimintojen mittaus.", price: 190 },
];

export const CARE_PLANS: Array<LocalizedOption & { value: CarePlan; monthly: number }> = [
  { value: "handoff", label: "Full handoff", labelFi: "Täysi luovutus", monthly: 0, description: "You own the accounts. Future updates are quoted separately.", descriptionFi: "Omistat tilit. Tulevat päivitykset hinnoitellaan erikseen." },
  { value: "care", label: "Technical care", labelFi: "Tekninen ylläpito", monthly: 69, description: "Availability checks, security updates and small technical fixes.", descriptionFi: "Saatavuuden seuranta, tietoturvapäivitykset ja pienet tekniset korjaukset." },
  { value: "managed", label: "Managed website", labelFi: "Hallinnoitu verkkosivusto", monthly: 149, description: "Technical care plus reasonable text and image updates each month.", descriptionFi: "Tekninen ylläpito sekä kohtuulliset teksti- ja kuvapäivitykset kuukausittain." },
  { value: "growth", label: "Managed growth", labelFi: "Hallinnoitu kasvu", monthly: 299, description: "Managed service plus recurring search, content and conversion improvements.", descriptionFi: "Hallinnoitu palvelu sekä säännölliset hakunäkyvyyden, sisällön ja yhteydenottojen parannukset." },
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
    features: Array.from(new Set(Array.isArray(input.features) ? input.features.filter((item) => validFeatures.has(item)) : [])).slice(0, FEATURE_OPTIONS.length),
    carePlan: care,
    urgent: Boolean(input.urgent),
  };
}

export function calculateEstimate(raw: Partial<EstimateInput>, language: PublicLanguage = "en"): EstimateResult {
  const input = normalizeEstimateInput(raw);
  const kind = SITE_KINDS.find((item) => item.value === input.siteKind) || SITE_KINDS[1];
  const care = CARE_PLANS.find((item) => item.value === input.carePlan) || CARE_PLANS[2];
  const extraPages = Math.max(0, input.pages - kind.includedPages);
  const pageCost = extraPages * 145;
  const languageCost = input.extraLanguages * 490;
  const featureCost = FEATURE_OPTIONS.filter((item) => input.features.includes(item.value)).reduce((sum, item) => sum + item.price, 0);
  let setupBase = kind.price + pageCost + languageCost + featureCost;
  if (input.urgent) setupBase *= 1.25;
  setupBase = Math.round(setupBase / 10) * 10;

  const low = Math.max(850, Math.round((setupBase * 0.92) / 10) * 10);
  const high = Math.round((setupBase * 1.18) / 10) * 10;
  const minWeeks = input.urgent ? Math.max(1, kind.weeks[0] - 1) : kind.weeks[0];
  const maxWeeks = input.urgent ? Math.max(minWeeks + 1, kind.weeks[1] - 1) : kind.weeks[1];
  const vatRate = Number(process.env.NEXT_PUBLIC_VAT_RATE || 25.5);
  const vatRegistered = process.env.NEXT_PUBLIC_VAT_REGISTERED === "true";
  const vatMultiplier = vatRegistered ? 1 + vatRate / 100 : 1;
  const fi = language === "fi";

  return {
    setupBase,
    setupLow: low,
    setupHigh: high,
    monthly: care.monthly,
    deliveryWeeks: fi ? `${minWeeks}–${maxWeeks} viikkoa` : `${minWeeks}–${maxWeeks} weeks`,
    included: fi ? [
      "Mobiilissa ja tietokoneella toimiva yksilöllinen ulkoasu",
      "Vercel-julkaisu, HTTPS ja verkkotunnuksen yhdistäminen",
      "Yhteydenottolomake ja tekniset hakukoneperusteet",
      "Suorituskyvyn, saavutettavuuden ja lomakkeiden testaus",
      "Kaksi sovittua korjauskierrosta ennen julkaisua",
      "Lähdekoodin ja palvelutilien omistus kirjataan sopimukseen",
    ] : [
      "Custom layout that works on phones and computers",
      "Vercel deployment, HTTPS and domain connection",
      "Contact form and technical search foundations",
      "Performance, accessibility and form testing",
      "Two agreed revision rounds before launch",
      "Source-code and service-account ownership written into the agreement",
    ],
    assumptions: fi ? [
      "Tämä on suuntaa-antava, ei-sitova arvio. Lopullinen kiinteä hinta vahvistetaan kirjallisessa tarjouksessa.",
      "Verkkotunnus, maksulliset sähköposti-, ajanvaraus-, viesti- ja maksupalvelut laskutetaan erikseen, ellei tarjouksessa toisin sovita.",
      "Tavallinen esittelysivusto ei yleensä tarvitse tietokantaa. Neon tai muu tietokanta lisätään vain todelliseen tarpeeseen.",
      vatRegistered ? `Hintoihin lisätään arvonlisävero ${vatRate} %. Verollinen summa näkyy alla.` : "Palveluntarjoajaa ei ole asetuksissa merkitty ALV-rekisteriin. Lopullinen tarjous kertoo sovellettavan verokäsittelyn.",
    ] : [
      "This is a non-binding planning estimate. The final fixed price is confirmed in a written proposal.",
      "Domains and paid email, booking, messaging and payment services are separate unless the proposal expressly includes them.",
      "A normal information website usually does not need a database. Neon or another database is added only when there is a real need.",
      vatRegistered ? `VAT at ${vatRate}% is added. The VAT-inclusive amount is shown below.` : "The provider is not marked as VAT-registered in the site settings. The final proposal states the applicable tax treatment.",
    ],
    vatRate,
    vatRegistered,
    setupLowWithVat: Math.round(low * vatMultiplier),
    setupHighWithVat: Math.round(high * vatMultiplier),
    monthlyWithVat: Math.round(care.monthly * vatMultiplier * 100) / 100,
  };
}

export function euro(value: number) {
  return new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}
