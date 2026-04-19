import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const { text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const prompt = `You are a highly intelligent data extraction engine.
I will provide you with raw, unstructured OCR text extracted from a student document.

Your task is to:
1. Determine if the document is a "college_timetable" OR "personal_tasks".
2. If "college_timetable":
   - Extract subjects with estimated totals
   - Extract schedule events (title, dayOfWeek, time)
3. If "personal_tasks":
   - Extract tasks with title, priority, dueDate

Return ONLY valid JSON. No markdown. No explanation.

Schema:
{
  "documentType": "college_timetable" | "personal_tasks",
  "subjects": [{ "name": "string", "total": number }],
  "events": [{ "title": "string", "dayOfWeek": "string", "time": "string" }],
  "tasks": [{ "title": "string", "priority": "low" | "medium" | "high", "dueDate": "string" }]
}

Raw OCR Text:
${text}
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: prompt }],
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI Error:", errText);
      throw new Error("OpenAI request failed");
    }

    const data = await openaiRes.json();

    const resultString =
      data.choices?.[0]?.message?.content || "{}";

    // Extract JSON safely
    const jsonMatch = resultString.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON structure found");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("AI Extraction Error:", err);

    return NextResponse.json(
      {
        error: "AI processing failed",
        fallback: {
          documentType: "personal_tasks",
          subjects: [],
          events: [],
          tasks: [],
        },
      },
      { status: 200 } 
    );
  }
}