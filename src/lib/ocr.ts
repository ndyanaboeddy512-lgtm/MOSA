export interface ExtractedLineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  confidence: number;
}

export interface OcrParseResult {
  merchantName: string;
  detectedDate: string;
  items: ExtractedLineItem[];
  totalAmount: number;
  currency: "RWF";
  sanitizedText: string;
  hasRedactions: boolean;
  overallConfidence: number;
}

/**
 * Sanitizes raw text by redacting payment cards and private customer phone numbers.
 * Receipts are evidence/data sources, not public documents exposing private user data.
 */
export function sanitizeReceiptText(rawText: string): { text: string; hasRedactions: boolean } {
  let text = rawText;
  let hasRedactions = false;

  // Mask 16-digit credit/debit card numbers or spaced 4x4 digits
  const cardRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
  const textBeforeCard = text;
  text = text.replace(cardRegex, (match) => {
    const clean = match.replace(/[- ]/g, "");
    return `****-****-****-${clean.slice(-4)}`;
  });
  if (text !== textBeforeCard) hasRedactions = true;

  // Mask customer phone numbers (Rwanda pattern: 07[2389]... or +250 7[2389]...)
  const customerPhoneRegex = /(?:Customer|Client|Kasitoma|User|Tel|Phone|P)\s*[:：\-]?\s*(?:\+?250\s*|0)?\s*(7[2389][0-9\s-]{6,10})\b/gi;
  const textBeforePhone = text;
  text = text.replace(customerPhoneRegex, "Client: +250 78* *** *** (Redacted for Privacy)");
  if (text !== textBeforePhone) hasRedactions = true;

  return { text, hasRedactions };
}

/**
 * Heuristic OCR Engine specialized in Rwandan receipts, price boards, and handwritten menus.
 */
export function parsePhysicalDocument(rawInputText: string, docType: "RECEIPT" | "MENU" | "PRICE_BOARD" | "STOREFRONT_SIGN"): OcrParseResult {
  const { text: cleanText, hasRedactions } = sanitizeReceiptText(rawInputText);
  const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);

  let merchantName = "Local Merchant";
  let detectedDate = new Date().toISOString().split("T")[0];
  const items: ExtractedLineItem[] = [];
  let totalAmount = 0;

  // 1. Detect Merchant Name from header lines
  for (let i = 0; i < Math.min(lines.length, 4); i++) {
    const line = lines[i];
    if (
      /TIN|DATE|TEL|PHONE|CASHIER|RECEIPT|INVOICE|FAGITIRE/i.test(line) ||
      /^\d+$/.test(line)
    ) {
      continue;
    }
    if (line.length > 3 && line.length < 50) {
      merchantName = line.replace(/^[#*=-]+\s*/, "").replace(/\s*[#*=-]+$/, "");
      break;
    }
  }

  // 2. Detect Date
  const dateRegex = /\b(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})\b/;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      detectedDate = match[1].replace(/[/.]/g, "-");
      break;
    }
  }

  // 3. Line Items & Price Extraction (RWF / Frw)
  // Matches patterns like:
  // "Type-C Charging Port 4500 RWF"
  // "Chapati Ishyushye: 300 FRW"
  // "Umuceri Gorillaz (1kg) - 1,800"
  // "1. Fade Haircut ........... 2000"
  const itemPriceRegex = /(?:^|\d+[\.\)]\s*)(.+?)(?::|\s+|-|\.{2,})\s*(\d{1,3}(?:[,\.]\d{3})+|\d+)\s*(?:RWF|FRW|FR|F)?$/i;
  const totalLineRegex = /(?:TOTAL|SUBTOTAL|NET|YOSE|HAMWE)\s*(?::|\s+)?\s*(\d{1,3}(?:[,\.]\d{3})+|\d+)/i;

  let itemIdCounter = 1;

  for (const line of lines) {
    // Check if line is a Total summary line
    const totalMatch = line.match(totalLineRegex);
    if (totalMatch) {
      const parsedTotal = parseInt(totalMatch[1].replace(/[,.]/g, ""), 10);
      if (!isNaN(parsedTotal) && parsedTotal > 0) {
        totalAmount = parsedTotal;
      }
      continue;
    }

    // Check if line is a product / service with price
    const itemMatch = line.match(itemPriceRegex);
    if (itemMatch) {
      let rawName = itemMatch[1].trim();
      const rawPrice = itemMatch[2].replace(/[,.]/g, "");
      const price = parseInt(rawPrice, 10);

      // Skip non-item lines like TIN, Tel, Change, Cash Received
      if (/^(TIN|TEL|PHONE|CASH|CHANGE|BALANCE|DATE|TIME|TAX|VAT)/i.test(rawName)) {
        continue;
      }

      if (rawName.length > 2 && !isNaN(price) && price > 50 && price < 5000000) {
        // Clean item name
        rawName = rawName.replace(/^[0-9]+[\.\)]\s*/, "").replace(/[.:_-]+$/, "").trim();

        // Categorize based on keywords
        let category = "General";
        if (/hair|cut|barber|fade|dread|beard|kogosha|imisatsi/i.test(rawName)) category = "Grooming";
        else if (/dress|tailor|suit|kitenge|kudoda|hem|zipper|fermeture/i.test(rawName)) category = "Tailoring";
        else if (/milk|tea|chapati|amata|icyayi|food|plate|bread|sambusa/i.test(rawName)) category = "Food & Drink";
        else if (/screen|phone|charge|port|battery|ecran|protector/i.test(rawName)) category = "Electronics Repair";
        else if (/oil|brake|moto|tire|engine|amavuta|ipine/i.test(rawName)) category = "Mechanic";
        else if (/rice|sugar|flour|oil|avocado|dodo|ibiribwa/i.test(rawName)) category = "Groceries";

        items.push({
          id: `item-${Date.now()}-${itemIdCounter++}`,
          name: rawName,
          price,
          quantity: 1,
          category,
          confidence: docType === "RECEIPT" ? 0.96 : docType === "PRICE_BOARD" ? 0.94 : 0.91,
        });
      }
    }
  }

  // If no total found from regex, sum item prices
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, item) => sum + item.price, 0);
  }

  const overallConfidence = items.length > 0 
    ? Number((items.reduce((acc, i) => acc + i.confidence, 0) / items.length).toFixed(2))
    : 0.75;

  return {
    merchantName,
    detectedDate,
    items,
    totalAmount,
    currency: "RWF",
    sanitizedText: cleanText,
    hasRedactions,
    overallConfidence,
  };
}

/**
 * Pre-set sample physical documents for immediate interactive testing by Community Agents or evaluators.
 */
export const SAMPLE_PHYSICAL_DOCUMENTS = [
  {
    id: "sample-receipt-phone",
    title: "Cosmos Tech Repair Receipt (Biryogo)",
    type: "RECEIPT" as const,
    text: `COSMOS PHONE CLINIC & REPAIRS
TIN: 104829104
Nyamirambo, Biryogo Car-Free Zone
Tel: 0788345678
Date: 2026-09-14 15:30

1. Type-C Charging Pin Replacement    4,500 RWF
2. Samsung A12 Screen Assembly       18,000 RWF
3. Ceramic Matte Screen Guard         2,500 RWF

SUBTOTAL: 25,000 RWF
TOTAL: 25,000 RWF
Cash Tendered: 25,000 RWF
Client: 0788112233
Payment: Mobile Money`,
  },
  {
    id: "sample-board-salon",
    title: "Salon Nova Style Price Board (Biryogo)",
    type: "PRICE_BOARD" as const,
    text: `IBICIRO BYA SALO NOVA STYLE
Kogosha Gusa (Fade / Style): 2000 Frw
Koza Umutwe n'Isabune: 1000 Frw
Gusukura Ubwanwa (Hot Towel): 1500 Frw
Gufunga Dreadlocks: 8000 Frw
Gusiga Rangi Imisatsi: 5000 Frw
Kogosha Abana: 1500 Frw`,
  },
  {
    id: "sample-menu-milkbar",
    title: "Kivugiza Fresh Milk Bar Chalkboard Menu",
    type: "MENU" as const,
    text: `AMATA MEZA YA KIVUGIZA (MENU)
Amata Mashyuha (Igikombe 1): 500 FRW
Amata Akonje y'Ikivuguto: 600 FRW
Chapati Ishyushye y'Icyitegererezo: 300 FRW
Icyayi cy'Amazi kirimo Tangawizi: 300 FRW
Igi Ritetse: 300 FRW
Sambusa y'Inyama: 250 FRW`,
  },
  {
    id: "sample-receipt-tailor",
    title: "Atelier de Couture Umwiza Receipt",
    type: "RECEIPT" as const,
    text: `ATELIER DE COUTURE UMWIZA
Nyamirambo - Cosmos
Date: 2026-09-12
Client Name: Marie Claire
Phone: 0788998877

1. Ikanzu y'Igitenge (Dress Tailoring)    14,000 RWF
2. Guhindura Fermeture (Zipper Fix)         1,500 RWF
3. Gukata Ipantalo (Trouser Hemming)        2,000 RWF

TOTAL: 17,500 RWF
Advance Paid: 10,000 RWF
Balance Due: 7,500 RWF`,
  },
];
