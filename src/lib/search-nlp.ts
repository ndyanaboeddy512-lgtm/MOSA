/**
 * MOSA Natural Language Location & Commerce Query Parser
 * Interprets queries like "fruit shops in Kimironko", "phone repair near MINAGRI",
 * "tailor in Biryogo under 1500 Frw", "amaduka muri Kacyiru".
 */

export interface ParsedSearchQuery {
  rawQuery: string;
  cleanQuery: string;             // e.g. "fruit shops"
  locationModifier?: string;      // e.g. "Kimironko", "MINAGRI"
  locationType?: "SECTOR" | "CELL" | "LANDMARK" | "DISTRICT" | "PROVINCE";
  priceMax?: number;              // e.g. 1500
  priceMin?: number;
  detectedCategory?: string;      // e.g. "food_restaurant", "phone_electronics"
  matchedLandmark?: string;
  matchedSector?: string;
  matchedCell?: string;
}

// Known geographic entities in Rwanda for rapid NLP matching
const KNOWN_SECTORS = [
  "kacyiru", "nyamirambo", "kimironko", "remera", "gisozi",
  "kanombe", "kicukiro", "niboye", "kagarama", "gikondo",
  "muhoza", "huye", "rubavu", "musanze", "nyagatare",
  "muhima", "nyarugenge", "rwezamenyo"
];

const KNOWN_CELLS = [
  "kamutwa", "kibaza", "kamatamu", "biryogo", "mumena",
  "cyivugiza", "kigali", "nyakabanda", "kibagabaga", "nyabisindu"
];

const KNOWN_LANDMARKS = [
  { key: "minagri", name: "MINAGRI Area (KG 569 St)", sector: "Kacyiru", cell: "Kamutwa" },
  { key: "cosmos", name: "Cosmos Junction", sector: "Nyamirambo", cell: "Biryogo" },
  { key: "biryogo car-free", name: "Biryogo Car-Free Zone", sector: "Nyamirambo", cell: "Biryogo" },
  { key: "car free zone", name: "Biryogo Car-Free Zone", sector: "Nyamirambo", cell: "Biryogo" },
  { key: "tapi rouge", name: "Tapi Rouge", sector: "Nyamirambo", cell: "Mumena" },
  { key: "mumena stadium", name: "Mumena Stadium", sector: "Nyamirambo", cell: "Mumena" },
  { key: "green mosque", name: "Green Mosque (Biryogo)", sector: "Nyamirambo", cell: "Biryogo" },
  { key: "onatracom", name: "Onatracom", sector: "Nyamirambo", cell: "Rwezamenyo" },
  { key: "nyabugogo", name: "Nyabugogo Bus Park", sector: "Muhima", cell: "Nyabugogo" }
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  salon_barber: ["salon", "barber", "haircut", "imishatsi", "yogosha", "imisatsi", "braids", "coiffure"],
  tailor_crafts: ["tailor", "sewing", "umudozi", "ubudozi", "igitenge", "dresses", "clothes repair", "couture"],
  food_restaurant: ["fruit", "fruits", "vegetables", "restaurant", "food", "milk", "amata", "bakery", "bread", "cafe", "coffee", "ibiryo", "imbuto"],
  phone_electronics: ["phone", "repair", "electronics", "screen", "charger", "telefoni", "mudasobwa", "computer", "smartphone"],
  mechanic_repair: ["mechanic", "garage", "moto", "car repair", "igare", "imodoka", "spares", "pneu", "tyre"],
  shop_retail: ["shop", "boutique", "grocery", "duka", "amaduka", "supermarket", "alimentacion", "stationery"],
};

/**
 * Parses user search query into structured query + location intent + price constraints
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  if (!query || !query.trim()) {
    return { rawQuery: "", cleanQuery: "" };
  }

  const raw = query.trim();
  let working = raw.toLowerCase();

  let priceMax: number | undefined;
  let priceMin: number | undefined;

  // 1. Detect Price Constraints: "under 2000", "munsi ya 1500", "< 5000", "below 3000"
  const priceRegex = /(?:under|below|less than|munsi ya|<)\s*(\d+[\d,]*)\s*(?:rwf|frw|frs)?/i;
  const priceMatch = working.match(priceRegex);
  if (priceMatch) {
    const parsed = parseInt(priceMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(parsed)) {
      priceMax = parsed;
      working = working.replace(priceMatch[0], " ").trim();
    }
  }

  // 2. Detect Landmark Mentions
  let matchedLandmark: string | undefined;
  let matchedSector: string | undefined;
  let matchedCell: string | undefined;
  let locationModifier: string | undefined;
  let locationType: ParsedSearchQuery["locationType"];

  for (const lm of KNOWN_LANDMARKS) {
    if (working.includes(lm.key)) {
      matchedLandmark = lm.name;
      matchedSector = lm.sector;
      matchedCell = lm.cell;
      locationModifier = lm.name;
      locationType = "LANDMARK";
      // Remove the landmark from the working query
      const lmRegex = new RegExp(`(?:near|ahegereye|around|at|ku|muri)?\\s*${lm.key}`, "i");
      working = working.replace(lmRegex, " ").trim();
      break;
    }
  }

  // 3. Detect Sector or Cell mentions if landmark not found
  if (!locationModifier) {
    // Check preposition phrases: "in [location]", "muri [location]", "near [location]"
    const prepRegex = /(?:in|muri|near|ahegereye|around|close to|ku)\s+([a-zA-Z\s'-]+)$/i;
    const prepMatch = working.match(prepRegex);

    if (prepMatch) {
      const candidate = prepMatch[1].trim().toLowerCase();
      const matchedSec = KNOWN_SECTORS.find((s) => candidate.includes(s));
      const matchedC = KNOWN_CELLS.find((c) => candidate.includes(c));

      if (matchedSec) {
        matchedSector = matchedSec.charAt(0).toUpperCase() + matchedSec.slice(1);
        locationModifier = matchedSector;
        locationType = "SECTOR";
        working = working.replace(prepMatch[0], " ").trim();
      } else if (matchedC) {
        matchedCell = matchedC.charAt(0).toUpperCase() + matchedC.slice(1);
        locationModifier = matchedCell;
        locationType = "CELL";
        working = working.replace(prepMatch[0], " ").trim();
      } else {
        // Generic location name passed
        locationModifier = prepMatch[1].trim();
        locationType = "LANDMARK";
        working = working.replace(prepMatch[0], " ").trim();
      }
    } else {
      // Check direct word match
      for (const s of KNOWN_SECTORS) {
        if (working.includes(s)) {
          matchedSector = s.charAt(0).toUpperCase() + s.slice(1);
          locationModifier = matchedSector;
          locationType = "SECTOR";
          working = working.replace(new RegExp(`\\b${s}\\b`, "i"), " ").trim();
          break;
        }
      }
      if (!locationModifier) {
        for (const c of KNOWN_CELLS) {
          if (working.includes(c)) {
            matchedCell = c.charAt(0).toUpperCase() + c.slice(1);
            locationModifier = matchedCell;
            locationType = "CELL";
            working = working.replace(new RegExp(`\\b${c}\\b`, "i"), " ").trim();
            break;
          }
        }
      }
    }
  }

  // 4. Detect Category intent from the remaining tokens
  let detectedCategory: string | undefined;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => working.includes(kw))) {
      detectedCategory = cat;
      break;
    }
  }

  // Clean trailing punctuation and multiple spaces
  const cleanQuery = working.replace(/[,;]+/g, " ").replace(/\s+/g, " ").trim();

  return {
    rawQuery: raw,
    cleanQuery: cleanQuery || raw,
    locationModifier,
    locationType,
    priceMax,
    priceMin,
    detectedCategory,
    matchedLandmark,
    matchedSector,
    matchedCell,
  };
}
