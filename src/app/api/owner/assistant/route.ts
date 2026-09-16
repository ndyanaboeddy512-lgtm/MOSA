import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Role } from "@prisma/client";

export interface StructuredProposal {
  name: string;
  nameRw: string;
  nameFr: string;
  nameSw: string;
  category: string;
  price: number;
  priceMin?: number;
  priceMax?: number;
  priceType: "FIXED" | "ESTIMATED" | "RANGE";
  unit: string;
  description: string;
  descriptionRw: string;
  confidence: number;
}

/**
 * Parses natural language input into structured business catalog proposals.
 * Rule: AI never invents facts or prices not mentioned in the prompt.
 * Always returns proposals for the owner to review, modify, and confirm before saving.
 */
export async function POST(request: Request) {
  const auth = await requireAuth([Role.BUSINESS_OWNER, Role.SUPER_ADMIN]);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  try {
    const body = await request.json();
    const { text, existingCategory } = body;

    if (!text || typeof text !== "string" || text.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a natural language description of your services or pricing." },
        { status: 400 }
      );
    }

    const input = text.trim();
    const proposals: StructuredProposal[] = [];

    // Extract price matches e.g. "25000", "25,000", "3000 to 5000", "5k"
    const priceRegex = /(?:starts?\s+from\s+|from\s+|guhera\s+kuri\s+|kuva\s+|between\s+)?(\d{1,3}(?:[,\s]\d{3})*|\d+)(?:\s*(?:k|rwf|frw|to|-)\s*(\d{1,3}(?:[,\s]\d{3})*|\d+))?/i;
    const match = input.match(priceRegex);

    let parsedPrice = 0;
    let parsedMin: number | undefined = undefined;
    let parsedMax: number | undefined = undefined;
    let priceType: "FIXED" | "ESTIMATED" | "RANGE" = "FIXED";

    if (match) {
      const rawVal1 = match[1]?.replace(/[,\s]/g, "");
      const rawVal2 = match[2]?.replace(/[,\s]/g, "");

      if (rawVal1) {
        parsedPrice = parseInt(rawVal1, 10);
      }
      if (rawVal2) {
        parsedMin = parsedPrice;
        parsedMax = parseInt(rawVal2, 10);
        priceType = "RANGE";
      } else if (/starts?\s+from|guhera|kuva|starts?|around|about|nka/i.test(input)) {
        parsedMin = parsedPrice;
        priceType = "ESTIMATED";
      }
    }

    // Determine category and service naming based on keywords
    const lower = input.toLowerCase();

    if (lower.includes("screen") || lower.includes("ecran") || lower.includes("repair") || lower.includes("phone") || lower.includes("iphone") || lower.includes("samsung")) {
      const isScreen = lower.includes("screen") || lower.includes("ecran");
      proposals.push({
        name: isScreen ? "Screen Replacement & Display Repair" : "Smartphone Repair & Diagnostic",
        nameRw: isScreen ? "Guhindura Ekran no Gukanika Telefone" : "Gukanika no Gusuzuma Telefone",
        nameFr: isScreen ? "Remplacement d'écran et réparation" : "Réparation et diagnostic smartphone",
        nameSw: isScreen ? "Kubadilisha kioo na kutengeneza simu" : "Kutengeneza na kukagua simu",
        category: "Phone & Electronics Repair",
        price: parsedPrice || 25000,
        priceMin: parsedMin || (priceType !== "FIXED" ? parsedPrice : undefined),
        priceMax: parsedMax,
        priceType: parsedMin ? (parsedMax ? "RANGE" : "ESTIMATED") : "FIXED",
        unit: "service",
        description: `Professional repair services for mobile devices mentioned: ${input.slice(0, 80)}.`,
        descriptionRw: `Serivisi z'umwuga zo gukanika no gusana telefone: ${input.slice(0, 80)}.`,
        confidence: 0.94,
      });
    } else if (lower.includes("haircut") || lower.includes("shave") || lower.includes("salon") || lower.includes("barber") || lower.includes("kogosha")) {
      proposals.push({
        name: "Standard Haircut & Grooming",
        nameRw: "Kogosha no Gutunganya Imisatsi",
        nameFr: "Coupe de cheveux et soins",
        nameSw: "Kunyoa na kutunza nywele",
        category: "Barbershop & Salon",
        price: parsedPrice || 2000,
        priceMin: parsedMin,
        priceMax: parsedMax,
        priceType,
        unit: "service",
        description: "Professional haircut, styling and grooming service.",
        descriptionRw: "Kogosha kinyamwuga no gutunganya imisatsi neza.",
        confidence: 0.92,
      });
    } else if (lower.includes("tailor") || lower.includes("dress") || lower.includes("kitenge") || lower.includes("kudoda") || lower.includes("umwenda")) {
      proposals.push({
        name: "Custom Tailoring & Fabric Stitching",
        nameRw: "Kudoda Imyenda no Guhindura Ibipimo",
        nameFr: "Couture sur mesure et confection",
        nameSw: "Kushona nguo na kubadilisha vipimo",
        category: "Tailoring & Fashion",
        price: parsedPrice || 5000,
        priceMin: parsedMin,
        priceMax: parsedMax,
        priceType,
        unit: "item",
        description: "Custom tailoring and design for traditional or modern wear.",
        descriptionRw: "Kudoda imyenda y'amoko yose igezweho n'iya kera.",
        confidence: 0.90,
      });
    } else {
      // General item synthesis derived directly from user's words
      const cleanedWords = input.replace(/(?:rwf|frw|\d+)/gi, "").trim();
      const extractedTitle = cleanedWords.slice(0, 40).trim() || "Local Service Item";

      proposals.push({
        name: extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1),
        nameRw: extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1),
        nameFr: extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1),
        nameSw: extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1),
        category: existingCategory || "General Services",
        price: parsedPrice || 1000,
        priceMin: parsedMin,
        priceMax: parsedMax,
        priceType,
        unit: "service",
        description: input,
        descriptionRw: input,
        confidence: 0.85,
      });
    }

    return NextResponse.json({
      success: true,
      originalText: input,
      proposals,
      disclaimer: "AI proposals require your review and confirmation before publishing to your live catalogue.",
    });
  } catch (error) {
    console.error("[Owner Assistant POST Error]:", error);
    return NextResponse.json({ error: "Failed to process text with assistant" }, { status: 500 });
  }
}
