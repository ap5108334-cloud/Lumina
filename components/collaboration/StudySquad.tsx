"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Users, Zap, TrendingUp, TrendingDown, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface SquadMember {
  id: string;
  score: number;
  debt: number;
  isFocusing: boolean;
  lastUpdate: number;
}

export default function StudySquad({ squadFocus }: { squadFocus: Record<string, SquadMember> }) {
  const members = Object.values(squadFocus);
  const activeFocusers = members.filter(m => m.isFocusing).length;

  // Prepare graph data (simplified for real-time visualization)
  // In a real app, we'd historical debt, but here we'll show current 'Focus Capacity'
  const chartData = members.map(m => ({
    name: m.id,
    Score: m.score,
    Debt: m.debt
  }));

  return (
    <Card className="border-border/50 bg-card/10 backdrop-blur-xl h-full flex flex-col overflow-hidden">
      <CardHeader className="py-4 px-6 border-b border-border/50 flex flex-row items-center justify-between shrink-0 bg-background/20">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-lumina-cyan" />
          <CardTitle className="text-sm font-bold tracking-tight">Study Squad</CardTitle>
        </div>
        <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] h-6 flex items-center gap-1">
               <ShieldCheck className="w-2.5 h-2.5" /> Anonymized
            </Badge>
            <Badge className="bg-lumina-cyan/20 text-lumina-cyan border-lumina-cyan/30 text-[10px] h-6">
              {activeFocusers} Live
            </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* Heatmap/Score Overview */}
        <div className="space-y-4">
           <div className="flex justify-between items-end">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Squad Focus Flow</h4>
              <p className="text-[10px] text-muted-foreground/60 italic">Aggregated Focus Energy</p>
           </div>
           
           <div className="h-40 bg-background/30 rounded-2xl border border-border/30 p-4">
             {members.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                   <XAxis dataKey="name" hide />
                   <YAxis hide />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(9, 9, 11, 0.9)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                   />
                   <Area type="monotone" dataKey="Score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} radius={4} />
                   <Area type="monotone" dataKey="Debt" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} radius={4} />
                 </AreaChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-2">
                  <Clock className="w-8 h-8" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for squad activity...</p>
               </div>
             )}
           </div>
        </div>

        {/* Live Member Feed */}
        <div className="space-y-3">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Anonymized Activity</h4>
           <div className="space-y-2">
              {members.map((m, i) => (
                <div key={m.id} className="p-3 rounded-xl border border-border/30 bg-background/20 flex items-center justify-between group hover:bg-background/40 transition-all">
                   <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                        m.isFocusing ? "bg-lumina-cyan/20 text-lumina-cyan" : "bg-muted/30 text-muted-foreground"
                      )}>
                        <Zap className={cn("w-4 h-4", m.isFocusing && "animate-pulse")} />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold">{m.id}</p>
                        <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">
                           {m.isFocusing ? "Deep Focus active" : "Taking a break"}
                        </p>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                         <TrendingUp className={cn("w-3 h-3", m.score > 70 ? "text-green-500" : "text-muted-foreground")} />
                         <span className={cn("text-sm font-black", m.score > 70 ? "text-green-400" : "text-foreground")}>{m.score}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                         <span className={cn("text-[9px] font-bold", m.debt > 30 ? "text-red-400" : "text-muted-foreground")}>DEBT: {m.debt}%</span>
                      </div>
                   </div>
                </div>
              ))}

              {members.length === 0 && (
                 <p className="text-[11px] text-muted-foreground italic text-center py-4">Establish focus to invite social pressure.</p>
              )}
           </div>
        </div>

        {/* Squad Insight */}
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 mt-4">
           <p className="text-[10px] leading-relaxed text-muted-foreground font-medium">
             <span className="text-primary font-bold">PRO TIP:</span> When you see the squad score average above 80%, users report 24% higher task completion. Stay focused for the squad.
           </p>
        </div>
      </CardContent>
    </Card>
  );
}
