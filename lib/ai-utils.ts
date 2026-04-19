import { NoteAttachment } from "./types";

/** Clean extracted text: filter out garbage lines and keep only readable text */
export function cleanExtractedText(raw: string): string {
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (line.length < 5) return false;
      // Filter out lines that are mostly non-alphanumeric (binary junk)
      const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
      return alphaCount / line.length > 0.4;
    })
    .join("\n");
}

/** Split clean text into real sentences */
export function extractSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && (s.match(/[a-zA-Z]/g) || []).length > s.length * 0.4);
}

/** Extract meaningful capitalized terms/phrases from text */
export function extractKeyTerms(text: string): string[] {
  const phrases = text.match(/[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*/g) || [];
  // Deduplicate and remove very common ones
  const common = new Set(["The", "This", "These", "That", "However", "Therefore", "Furthermore", "Moreover", "Although", "While"]);
  const seen = new Set<string>();
  return phrases.filter((p) => {
    const key = p.toLowerCase();
    if (common.has(p.split(" ")[0]) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 15);
}

export function generateSummary(text: string, title: string): string {
  const clean = cleanExtractedText(text);
  if (!clean || clean.length < 30) return "Not enough readable content to summarize. The uploaded file may be image-based or contain unsupported encoding.";
  
  const sentences = extractSentences(clean);
  const wordCount = clean.split(/\s+/).length;
  const terms = extractKeyTerms(clean);
  
  let summary = `# 📋 Summary: ${title}\n\n`;
  summary += `**Document Stats:** ~${wordCount.toLocaleString()} words, ${sentences.length} key sentences\n\n`;
  summary += `---\n\n`;
  
  if (terms.length > 0) {
    summary += `## 🔑 Key Concepts\n\n`;
    terms.slice(0, 8).forEach((term) => {
      summary += `- **${term}**\n`;
    });
    summary += `\n`;
  }
  
  summary += `## 📌 Key Points\n\n`;
  const importantKeywords = ["important", "key", "main", "conclusion", "result", "therefore", "significant", "critical", "essential", "objective", "goal", "purpose", "findings", "recommend"];
  
  const importantSentences = sentences.filter((s) => importantKeywords.some((k) => s.toLowerCase().includes(k)));
  const selectedSentences = importantSentences.length > 0 
    ? importantSentences.slice(0, 6) 
    : sentences.filter((_, i) => i === 0 || i === sentences.length - 1 || i % Math.max(1, Math.floor(sentences.length / 5)) === 0).slice(0, 6);
  
  selectedSentences.forEach((s) => {
    summary += `- ${s}\n`;
  });
  
  summary += `\n## 📝 Overview\n\n`;
  const overviewSentences = sentences.slice(0, 4);
  summary += overviewSentences.join(" ") + "\n\n";
  
  summary += `---\n`;
  summary += `*📖 Estimated read time: ~${Math.ceil(wordCount / 200)} min*\n`;
  
  return summary;
}

export function generateRevisionNotes(text: string, title: string): string {
  const clean = cleanExtractedText(text);
  if (!clean || clean.length < 30) return "Not enough readable content for revision notes. The uploaded file may be image-based.";
  
  const sentences = extractSentences(clean);
  const words = clean.split(/\s+/);
  const terms = extractKeyTerms(clean);
  
  let notes = `# 📖 Revision Notes: ${title}\n\n`;
  notes += `> Quick revision guide generated from your document\n\n`;
  notes += `---\n\n`;
  
  notes += `## 🔑 Key Terms & Concepts\n\n`;
  if (terms.length > 0) {
    terms.slice(0, 10).forEach((term) => {
      const context = sentences.find((s) => s.toLowerCase().includes(term.toLowerCase()));
      if (context) {
        const snippet = context.length > 120 ? context.substring(0, 120) + "..." : context;
        notes += `- **${term}**: ${snippet}\n`;
      } else {
        notes += `- **${term}**\n`;
      }
    });
  }
  
  notes += `\n## 📝 Important Points\n\n`;
  const importantSentences = sentences.filter((s) => 
    /important|key|main|note|remember|critical|essential|significant|conclusion|result/i.test(s)
  ).slice(0, 6);
  
  const pointSentences = importantSentences.length > 0 ? importantSentences : sentences.slice(0, 6);
  pointSentences.forEach((s, i) => {
    notes += `${i + 1}. ${s}\n`;
  });
  
  notes += `\n## ❓ Self-Test Questions\n\n`;
  const questionTopics = terms.slice(0, 5);
  if (questionTopics.length > 0) {
    questionTopics.forEach((topic, i) => {
      notes += `${i + 1}. What is **${topic}** and why is it important?\n`;
    });
  }
  
  notes += `\n## 📊 Quick Stats\n\n`;
  notes += `| Metric | Value |\n`;
  notes += `|--------|-------|\n`;
  notes += `| Total Words | ~${words.length.toLocaleString()} |\n`;
  notes += `| Key Sentences | ${sentences.length} |\n`;
  notes += `| Key Terms | ${terms.length} |\n`;
  notes += `| Est. Read Time | ~${Math.ceil(words.length / 200)} min |\n`;
  
  return notes;
}

export function generateFlowchart(text: string, title: string): string {
  const clean = cleanExtractedText(text);
  if (!clean || clean.length < 30) return "Not enough readable content to create a flowchart. The uploaded file may be image-based.";
  
  const sentences = extractSentences(clean);
  const terms = extractKeyTerms(clean);
  
  let flowchart = `# 🔀 Concept Flowchart: ${title}\n\n`;
  flowchart += `---\n\n`;
  flowchart += `## 📋 Process Flow\n\n`;
  
  const steps = sentences.slice(0, 7);
  steps.forEach((s, i) => {
    const shortText = s.length > 80 ? s.substring(0, 80) + "..." : s;
    if (i === 0) {
      flowchart += `**🟢 START** → ${shortText}\n\n`;
    } else if (i === steps.length - 1) {
      flowchart += `  ↓\n\n`;
      flowchart += `**🔴 END** → ${shortText}\n\n`;
    } else {
      flowchart += `  ↓\n\n`;
      flowchart += `**Step ${i}** → ${shortText}\n\n`;
    }
  });
  
  if (terms.length > 1) {
    flowchart += `---\n\n`;
    flowchart += `## 🗺️ Concept Map\n\n`;
    flowchart += `**Central Topic:** ${title}\n\n`;
    
    const branches = terms.slice(0, 8);
    branches.forEach((term) => {
      const related = sentences.find((s) => s.toLowerCase().includes(term.toLowerCase()));
      const snippet = related ? (related.length > 60 ? related.substring(0, 60) + "..." : related) : "";
      flowchart += `- **${term}**${snippet ? ` — ${snippet}` : ""}\n`;
    });
  }
  
  if (terms.length > 3) {
    flowchart += `\n## 🔗 Relationships\n\n`;
    for (let i = 0; i < Math.min(terms.length - 1, 5); i++) {
      flowchart += `- ${terms[i]} → ${terms[i + 1]}\n`;
    }
  }
  
  return flowchart;
}

// ──────────────────────────────────────────────
// Extraction Utilities
// ──────────────────────────────────────────────

export async function extractTextFromFile(file: globalThis.File): Promise<string> {
  if (file.type === "text/plain" || file.type === "text/markdown") {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.readAsText(file);
    });
  } else if (file.type === "application/pdf") {
    return extractTextFromPDF(file);
  } else if (file.type.startsWith("image/")) {
    return "[Image file - visual content]";
  } else if (file.type.includes("word") || file.type.includes("document")) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = extractTextFromDocx(e.target?.result as ArrayBuffer);
        resolve(text);
      };
      reader.readAsArrayBuffer(file);
    });
  } else {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.readAsText(file);
    });
  }
}

async function extractTextFromPDF(file: globalThis.File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
    
    const textParts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");
      if (pageText.trim()) {
        textParts.push(pageText.trim());
      }
    }

    return textParts.join("\n\n") || "PDF content could not be extracted.";
  } catch (err) {
    console.error("PDF extraction error:", err);
    return "PDF file uploaded. Text extraction error.";
  }
}

function extractTextFromDocx(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const textParts: string[] = [];
    const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      textParts.push(match[1]);
    }
    return textParts.join(" ") || "Word content uploaded.";
  } catch {
    return "Word file processing error.";
  }
}

export function fileToDataUrl(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
