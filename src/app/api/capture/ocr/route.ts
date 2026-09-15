import { NextResponse } from "next/server";
import { parsePhysicalDocument } from "@/lib/ocr";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rawText, documentType = "RECEIPT" } = body;

    if (!rawText) {
      return NextResponse.json({ error: "Missing rawText in request body" }, { status: 400 });
    }

    const result = parsePhysicalDocument(rawText, documentType);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process physical document" }, { status: 500 });
  }
}
