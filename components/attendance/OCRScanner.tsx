"use client";

import { useState, useCallback } from "react";
import { UploadCloud, CheckCircle2, FileText, Loader2, Scan } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ParsedSubject {
  name: string;
  total: number;
}

interface ParsedEvent {
  title: string;
  dayOfWeek: string;
  time: string;
}

interface ParsedTask {
  title: string;
  priority: "low" | "medium" | "high";
  dueDate: string;
}

export interface AIParsedResult {
  documentType: "college_timetable" | "personal_tasks";
  subjects: ParsedSubject[];
  events: ParsedEvent[];
  tasks: ParsedTask[];
}

export function OCRScanner({ onParsed }: { onParsed: (result: AIParsedResult) => void }) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [parsedResult, setParsedResult] = useState<AIParsedResult | null>(null);

  const extractPdfText = async (file: File): Promise<string> => {
    setProgressText("Initializing PDF reader...");
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(Math.round((i / pdf.numPages) * 100));
        setProgressText(`Scanning page ${i} of ${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
    }
    return fullText;
  };

  const extractImageText = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === "recognizing text") {
              setProgress(Math.round(m.progress * 100));
              setProgressText("Extracting schedule data...");
            } else {
              setProgressText(m.status);
            }
          }
        }
      ).then(({ data: { text } }) => resolve(text))
       .catch(reject);
    });
  };

  const parseWithAI = async (text: string) => {
    setProgressText("Sending to Lumina LLM for Document Classification...");
    try {
      const res = await fetch("/api/ai/extract-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!res.ok) {
        throw new Error("Server rejected the request.");
      }
      const data: AIParsedResult = await res.json();
      setParsedResult(data);
    } catch (err) {
      console.error(err);
      toast.error("AI Document Parsing Failed. Try a clearer image or shorter document.");
      setProgressText("");
      setParsedResult(null);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsScanning(true);
    setProgress(0);
    setParsedResult(null);
    
    try {
      let extractedText = "";
      if (file.type === "application/pdf") {
        extractedText = await extractPdfText(file);
      } else if (file.type.startsWith("image/")) {
        extractedText = await extractImageText(file);
      }

      setProgressText("Applying AI heuristics...");
      setProgress(100);
      
      // Truncate to 12000 characters to allow full PDF parsing without blowing up LLM local limits
      const sanitizedText = extractedText.substring(0, 12000);
      await parseWithAI(sanitizedText);
      setIsScanning(false);
      
    } catch (err) {
      console.error(err);
      setProgressText("Failed to process file.");
      setIsScanning(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-6">
      {!parsedResult && !isScanning && (
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300",
            isDragActive ? "border-lumina-purple bg-lumina-purple/5" : "border-border/50 hover:border-primary/50 hover:bg-card/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
             <UploadCloud className="w-8 h-8 text-lumina-purple" />
          </div>
          <h3 className="text-lg font-bold">Upload Timetable</h3>
          <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">
             Drag & drop a PDF or Image. Lumina AI will detect if it's a College Timetable or Personal Tasks.
          </p>
        </div>
      )}

      {isScanning && (
        <div className="bg-card/30 border border-border/50 rounded-xl p-6 text-center space-y-4 animate-pulse">
           <div className="relative w-24 h-24 mx-auto bg-secondary/30 rounded-xl flex items-center justify-center overflow-hidden">
             <Scan className="w-8 h-8 text-primary animate-bounce relative z-10" />
             {/* Scan line effect */}
             <div className="absolute top-0 left-0 w-full h-1 bg-lumina-cyan/50 shadow-[0_0_15px_#22d3ee] animate-scan" />
           </div>
           <div>
             <h3 className="text-sm font-bold text-foreground">Analyzing Document...</h3>
             <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">{progressText}</p>
           </div>
           <Progress value={progress} className="h-1.5 w-full bg-secondary/50" indicatorClassName="bg-lumina-cyan" />
        </div>
      )}

      {parsedResult && !isScanning && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-green-500 mb-2 border border-green-500/20 bg-green-500/10 p-3 rounded-lg">
             <CheckCircle2 className="w-5 h-5 shrink-0" />
             <span className="text-sm font-semibold">
               Detected {parsedResult.documentType === "college_timetable" ? "College Timetable" : "Personal Schedule"}!
             </span>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
            {parsedResult.documentType === "college_timetable" && parsedResult.subjects.map((sub, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                     <FileText className="w-4 h-4 text-primary" />
                   </div>
                   <span className="font-medium text-sm">{sub.name}</span>
                 </div>
                 <Badge variant="outline" className="text-xs text-muted-foreground">
                   ~{sub.total} classes total
                 </Badge>
              </div>
            ))}
            {parsedResult.documentType === "personal_tasks" && parsedResult.tasks.map((task, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-md bg-lumina-cyan/10 flex items-center justify-center">
                     <FileText className="w-4 h-4 text-lumina-cyan" />
                   </div>
                   <div className="flex flex-col">
                     <span className="font-medium text-sm">{task.title}</span>
                     <span className="text-xs text-muted-foreground">Due: {task.dueDate}</span>
                   </div>
                 </div>
                 <Badge variant="outline" className={cn("text-xs uppercase", 
                    task.priority === 'high' ? 'text-red-400 border-red-500/30' : 
                    task.priority === 'medium' ? 'text-amber-400 border-amber-500/30' : 'text-blue-400 border-blue-500/30')}>
                   {task.priority}
                 </Badge>
              </div>
            ))}
          </div>
          <Button onClick={() => onParsed(parsedResult)} className="w-full bg-lumina-purple hover:bg-lumina-purple/90 group">
             {parsedResult.documentType === "college_timetable" ? "Add to Attendance Tracking" : "Import to Task Board"}
             <Scan className="w-4 h-4 ml-2 group-hover:rotate-90 transition-transform" />
          </Button>
        </div>
      )}
    </div>
  );
}
