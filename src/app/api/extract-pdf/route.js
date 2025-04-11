import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";
// Note: pdf-lib doesn’t provide direct page-to-image conversion in Node,
// so for a fully handwritten PDF you might consider processing the entire PDF as an image.
// For simplicity, this example runs OCR directly on the PDF buffer.
 
export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf");
    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded" }, { status: 400 });
    }
    
    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // For a fully handwritten PDF, assume it’s essentially a scanned image.
    // Run OCR on the entire PDF buffer.
    const ocrResult = await Tesseract.recognize(buffer, "eng", {
      logger: (m) => console.log(m), // Optional: logs progress info
    });
    const extractedText = ocrResult.data.text;
    
    // Now use Pollinations Text Generation API to summarize the handwritten text.
    const summarizationPrompt = `Summarize the following handwritten text:\n${extractedText}`;
    
    const pollinationsResponse = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful summarizer." },
          { role: "user", content: summarizationPrompt }
        ],
        model: "openai", // Pollinations’ default text model
        seed: 42,
        jsonMode: true
      })
    });
    
    const pollinationsData = await pollinationsResponse.json();
    const summary = pollinationsData.choices?.[0]?.message?.content || "";
    
    return NextResponse.json({ extractedText, summary });
  } catch (error) {
    console.error("Error processing handwritten PDF:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
