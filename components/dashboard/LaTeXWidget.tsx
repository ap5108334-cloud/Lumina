"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, RefreshCw, FileText, Layout, Maximize2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LaTeXWidget() {
  const [url, setUrl] = useState("https://arxiv.org/pdf/1706.03762.pdf"); // Valid LaTeX Paper without iframe locks
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <Card className="border-border/50 overflow-hidden bg-card/10 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="py-3 px-4 border-b border-border/50 bg-background/40 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <FileText className="w-4 h-4 text-orange-400" />
          </div>
          <CardTitle className="text-sm font-bold">LaTeX Remote Preview</CardTitle>
        </div>
        <div className="flex items-center gap-1">
           <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-7 w-7 rounded-md", viewMode === "mobile" && "bg-primary/10 text-primary")}
            onClick={() => setViewMode(m => m === "desktop" ? "mobile" : "desktop")}
            title="Toggle Mobile View"
           >
             <Smartphone className="w-3.5 h-3.5" />
           </Button>
           <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={handleRefresh} disabled={isRefreshing}>
             <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
           </Button>
           <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" asChild>
             <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
             </a>
           </Button>
        </div>
      </CardHeader>
      
      <div className="px-4 pt-3 space-y-2">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest pl-1">Overleaf/direct PDF Link</p>
        <Input 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="Paste Overleaf URL..." 
          className="h-8 text-[11px] bg-background/50 border-border/50 rounded-lg focus-visible:ring-primary"
        />
      </div>

      <CardContent className="flex-1 p-4 overflow-hidden relative group">
        <div className={cn(
          "w-full h-full transition-all duration-500 mx-auto rounded-xl border border-border/30 bg-white/5 overflow-hidden",
          viewMode === "mobile" ? "max-w-[280px]" : "max-w-full"
        )}>
          {isRefreshing ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-background/80">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-[10px] text-muted-foreground uppercase font-black animate-pulse">Re-compiling Report...</p>
             </div>
          ) : (
            <embed 
              src={url} 
              type="application/pdf"
              className="w-full h-full" 
            />
          )}
        </div>
        
        {/* Overlay info */}
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
           <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Integration</span>
           </div>
        </div>
      </CardContent>
      
      <div className="p-3 border-t border-border/50 bg-background/20 text-center">
         <p className="text-[10px] text-muted-foreground font-medium">
            Compiled lab reports from <span className="text-orange-400 font-bold">Overleaf</span> sync here for mobile review.
         </p>
      </div>
    </Card>
  );
}
