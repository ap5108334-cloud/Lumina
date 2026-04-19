import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { ChatMessage, Note } from "@/lib/types";
import { randomUUID } from "crypto";

const FILE = "chat-history.json";
const OLLAMA_URL = "http://localhost:11434/api/chat";

export async function GET() {
  const history = readJSON<ChatMessage[]>(FILE, []);
  return NextResponse.json(history);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, useNotes } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const history = readJSON<ChatMessage[]>(FILE, []);

  // Build context from notes if requested
  let contextPrompt = "";
  if (useNotes) {
    const notes = readJSON<Note[]>("notes.json", []);
    if (notes.length > 0) {
      // 1. Keyword extraction from user message
      const textQuery = message.toLowerCase();
      const stopWords = new Set(["a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "in", "on", "at", "to", "for", "with", "about", "what", "how", "why", "where", "when", "can", "could", "would", "should", "do", "does", "did", "this", "that", "these", "those", "of", "it"]);
      const keywords = textQuery.split(/\W+/).filter((w: string) => w.length > 2 && !stopWords.has(w));
      
      // 2. Score notes based on keywords and exact query match
      const scoredNotes = notes.map((n) => {
        const titleMatch = n.title.toLowerCase();
        let contentToSearch = (n.content || "").toLowerCase();
        
        if (n.attachments && n.attachments.length > 0) {
          contentToSearch += " " + n.attachments.map((a: any) => a.name + " " + (a.textContent || "")).join(" ").toLowerCase();
        }
        
        let score = 0;
        
        // Exact raw query match guarantees high relevance
        if (titleMatch.includes(textQuery)) score += 50;
        if (contentToSearch.includes(textQuery)) score += 20;

        keywords.forEach((kw: string) => {
          if (titleMatch.includes(kw)) score += 10; // High weight for title mapping
          if (contentToSearch.includes(kw)) score += 1;
        });
        
        return { note: n, score };
      });
      
      // 3. Get top 3 scoring notes.
      let topNotes = scoredNotes.filter((sn) => sn.score > 0).sort((a,b) => b.score - a.score).slice(0, 3).map((sn) => sn.note);
      
      // If no keyword match, provide the 3 most recently created notes as fallback context
      if (topNotes.length === 0) {
         topNotes = notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3);
      }

      const notesSummary = topNotes
        .map((n) => {
          let content = `DOCUMENT TITLE: ${n.title}\nDOCUMENT CONTENT: ${n.content}`;
          if (n.attachments && n.attachments.length > 0) {
            const attachmentDocs = n.attachments
              .filter((a: any) => a.textContent)
              .map((a: any) => `\n--- ATTACHED PDF / FILE: ${a.name} ---\n${a.textContent.substring(0, 10000)}`) // Substring limits token explosion
              .join("\n");
            content += attachmentDocs;
          }
          return content;
        })
        .join("\n\n======\n\n");
        
      contextPrompt = `You are Lumina AI, an advanced, highly intelligent student study assistant.

IMPORTANT DIRECTIVES:
1. The student is asking a question about their study materials. You must primarily use the "RELEVANT STUDENT KNOWLEDGE BASE EXCERPTS" provided below to answer their query.
2. If asked for a "flowchart" or "process workflow", DO NOT output standard prose. YOU MUST output sequential steps clearly using formatting like:
   [Step 1: Start] ---> [Step 2: Process] ---> [Step 3: End]
3. If asked for a "summary" or "notes", you MUST use a highly structured format divided into exactly three sections: "### Key Concepts", "### Detailed Breakdown", and "### Executive Summary".
4. Make the text highly human-readable, engaging, clear, and smart. NEVER generate giant walls of text. Use bullet points and bolding aggressively.
5. If the provided excerpts do not contain the answer, politely state that you cannot find the answer in their documents, but provide a logical guess based on your general knowledge if you know it.

RELEVANT STUDENT KNOWLEDGE BASE EXCERPTS:
${notesSummary}
`;
    }
  } else {
    contextPrompt = `You are Lumina AI, an advanced student study assistant.
IMPORTANT DIRECTIVES:
1. Format explanations logically using clear headings and bullet points. Never use walls of text. 
2. If asked for a flowchart or process workflow, YOU MUST output sequential steps clearly using ASCII formatting like: [Start] ---> [Process] ---> [End]
3. Make all text highly human-readable, engaging, and smart.
`;
  }

  // Save user message
  const userMsg: ChatMessage = {
    id: randomUUID(),
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };
  history.push(userMsg);

  try {
    const ollamaRes = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        messages: [
          { role: "system", content: contextPrompt },
          ...history.map((m) => ({ role: m.role, content: m.content }))
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!ollamaRes.ok) {
      throw new Error(`Ollama responded with ${ollamaRes.status}`);
    }

    const data = await ollamaRes.json();
    const aiContent = data.message?.content || "Sorry, I couldn't generate a response.";

    const aiMsg: ChatMessage = {
      id: randomUUID(),
      role: "assistant",
      content: aiContent,
      timestamp: new Date().toISOString(),
    };
    history.push(aiMsg);
    writeJSON(FILE, history);

    return NextResponse.json({ message: aiMsg, history });
  } catch (error: unknown) {
    // Save error message
    const errMsg: ChatMessage = {
      id: randomUUID(),
      role: "assistant",
      content:
        "⚠️ Could not connect to Ollama. Make sure Ollama is running (`ollama serve`) and the llama3 model is installed (`ollama pull llama3`).",
      timestamp: new Date().toISOString(),
    };
    history.push(errMsg);
    writeJSON(FILE, history);
    return NextResponse.json({ message: errMsg, history, error: String(error) });
  }
}

export async function DELETE() {
  writeJSON(FILE, []);
  return NextResponse.json({ success: true });
}
