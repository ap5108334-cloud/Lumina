import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434/api/chat";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const prompt = `You are a highly intelligent data extraction engine.
I will provide you with raw, unstructured OCR text extracted from a student document.

Your task is to:
1. Determine if the document is a "college_timetable" (a weekly schedule of subjects/classes) OR "personal_tasks" (a to-do list, assignment list, or personal schedule).
2. If it is a "college_timetable", do two things:
   a) Identify the unique SUBJECTS mentioned. Estimate the 'total' classes for each subject based on frequency, assuming a full semester (e.g., if mentioned 3 times a week, estimate 40 total classes).
   b) Identify the actual SCHEDULE BLOCKS (events). For each occurrence of a class, extract its 'title' (subject name), 'dayOfWeek' (e.g., "Monday"), and 'time' (e.g., "10:00 AM").
3. If it is "personal_tasks", extract the action items. Formulate a short 'title', infer 'priority' (low, medium, high), and invent a realistic 'dueDate' (e.g., "2026-04-20" or "Friday").

You must return EXACTLY AND ONLY valid JSON. Do NOT wrap in markdown.
Do NOT include any extra text.

Schema:
{
  "documentType": "college_timetable" | "personal_tasks",
  "subjects": [
    { "name": "string", "total": number }
  ],
  "events": [
    { "title": "string", "dayOfWeek": "string", "time": "string" }
  ],
  "tasks": [
    { "title": "string", "priority": "low" | "medium" | "high", "dueDate": "string" }
  ]
}

ONE-SHOT EXAMPLE (YOU MUST MATCH THIS EXACT JSON STRUCTURE):
{
  "documentType": "college_timetable",
  "subjects": [
    { "name": "Calculus", "total": 45 },
    { "name": "Physics", "total": 40 }
  ],
  "events": [
    { "title": "Calculus", "dayOfWeek": "Monday", "time": "10:00 AM" },
    { "title": "Physics", "dayOfWeek": "Tuesday", "time": "2:00 PM" }
  ],
  "tasks": []
}

Raw OCR Text:
${text}
`;

    const ollamaRes = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        messages: [{ role: "system", content: prompt }],
        stream: false,
        format: "json", // Enforce JSON mode
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!ollamaRes.ok) throw new Error("Ollama error");

    const data = await ollamaRes.json();
    const resultString = data.message?.content || "{}";
    
    // Use regex to locate the JSON payload incase the model adds markdown or preamble
    const jsonMatch = resultString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
       throw new Error("No JSON structure found in response");
    }

    // Parse it so we fail serverside if it's broken
    const parsedJson = JSON.parse(jsonMatch[0]);
    
    return NextResponse.json(parsedJson);
  } catch (err) {
    console.error("AI Extraction Error:", err);
    return NextResponse.json({ error: "Failed to parse document with AI." }, { status: 400 });
  }
}
