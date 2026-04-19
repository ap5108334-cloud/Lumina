"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTime, cn } from "@/lib/utils";
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Zap, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { FocusSession } from "@/lib/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MODES = [
  { key: "focus", label: "Focus", duration: 25 * 60, color: "text-lumina-purple", bg: "bg-lumina-purple/10", icon: Brain },
  { key: "short", label: "Short Break", duration: 5 * 60, color: "text-lumina-cyan", bg: "bg-lumina-cyan/10", icon: Coffee },
  { key: "long", label: "Long Break", duration: 15 * 60, color: "text-lumina-green", bg: "bg-lumina-green/10", icon: Coffee },
];

const mockSocialData = [
  { time: "Mon", you: 45, friends: 30 },
  { time: "Tue", you: 55, friends: 40 },
  { time: "Wed", you: 40, friends: 50 },
  { time: "Thu", you: 70, friends: 55 },
  { time: "Fri", you: 65, friends: 60 },
  { time: "Sat", you: 80, friends: 45 },
  { time: "Sun", you: 95, friends: 65 },
];

export default function FocusPage() {
  const [modeKey, setModeKey] = useState("focus");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [cognitiveDebt, setCognitiveDebt] = useState(0);
  const [switchTimeline, setSwitchTimeline] = useState<{ timestamp: string; type: "switch" | "return" }[]>([]);
  const [debtHistory, setDebtHistory] = useState<{ time: string; debt: number }[]>([]);
  const [squadFocus, setSquadFocus] = useState<any>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Refs for event listeners to avoid closure staleness
  const runningRef = useRef(running);
  const modeKeyRef = useRef(modeKey);

  useEffect(() => {
    // Connect to collaboration server
    const io = require("socket.io-client");
    const socket = io("http://localhost:3005");
    socketRef.current = socket;

    socket.on("squad-focus-update", (data: any) => {
      setSquadFocus(data);
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    runningRef.current = running;
    modeKeyRef.current = modeKey;
  }, [running, modeKey]);

  const mode = MODES.find((m) => m.key === modeKey)!;

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/focus");
      const data = await res.json();
      setSessions(data);
    } catch {}
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    // We use a local variable in the closure instead of a React ref so we don't have dependency issues 
    // since this useEffect runs uniquely. Actually, we'll just track it right here:
    let isPenalized = false;

    const triggerPenalty = () => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (runningRef.current && modeKeyRef.current === "focus" && !isPenalized) {
        console.log("Focus Break Detected:", now);
        isPenalized = true;
        setRunning(false); // PAUSE the timer instantly
        setCognitiveDebt((d) => {
          const newDebt = Math.min(100, d + 15);
          setDebtHistory(prev => [...prev, { time: now, debt: newDebt }].slice(-20));
          return newDebt;
        });
        setSwitchTimeline((prev) => [{ timestamp: now, type: "switch" as const }, ...prev].slice(0, 10));
        
        toast.error("YOU SAID YOU WERE STUDYING. YOUR PHONE DISAGREES.", { 
          icon: "📱",
          description: "Cognitive focus broken. Timer paused and debt increased.",
          duration: 6000 
        });
      }
    };

    const triggerReturn = () => {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (isPenalized) {
        isPenalized = false;
        console.log("Returned from break:", now);
        setSwitchTimeline((prev) => [{ timestamp: now, type: "return" as const }, ...prev].slice(0, 10));
        toast.success("Welcome back. Refocus quickly to lower debt.");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) triggerPenalty();
      else triggerReturn();
    };

    const handleBlur = () => triggerPenalty();
    const handleFocus = () => triggerReturn();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []); 

  const logSession = useCallback(async (duration: number, type: string) => {
    try {
      await fetch("/api/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration, type }),
      });
      fetchSessions();
    } catch {}
  }, []);

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          // Debt Decay Logic
          if (t % 60 === 0 && cognitiveDebt > 0 && modeKey === "focus") {
            setCognitiveDebt((d) => Math.max(0, d - 1));
          }

          // Record debt history & emit focus update every 5s
          if (t % 5 === 0) {
            if (socketRef.current) {
              const focusScoreRaw = Math.min(100, Math.round((todaySessions.filter((s) => s.type === "focus").length / 8) * 100));
              const focusScore = Math.max(0, focusScoreRaw - Math.floor(cognitiveDebt / 2));
              socketRef.current.emit("focus-update", {
                score: focusScore,
                debt: cognitiveDebt,
                isFocusing: runningRef.current && modeKeyRef.current === "focus"
              });
            }

            if (t % 10 === 0) {
              setDebtHistory(prev => [
                ...prev, 
                { time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }), debt: cognitiveDebt }
              ].slice(-20));
            }
          }

          if (t <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            const elapsed = mode.duration;
            logSession(elapsed, modeKey === "focus" ? "focus" : "break");
            if (modeKey === "focus" && cognitiveDebt > 0) {
              setCognitiveDebt((d) => Math.max(0, d - 20)); 
            }
            toast.success(modeKey === "focus" ? "🎉 Focus session complete!" : "☕ Break complete!");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, modeKey, mode.duration, logSession, cognitiveDebt]);

  const switchMode = (key: string) => {
    setRunning(false);
    setModeKey(key);
    const m = MODES.find((m) => m.key === key)!;
    setTimeLeft(m.duration);
  };

  const reset = () => {
    setRunning(false);
    setTimeLeft(mode.duration);
  };

  const pct = ((mode.duration - timeLeft) / mode.duration) * 100;
  const circumference = 2 * Math.PI * 90;
  const dashOffset = circumference - (pct / 100) * circumference;

  const todaySessions = sessions.filter((s) => {
    const today = new Date();
    const d = new Date(s.completedAt);
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  });

  const liveElapsedFocus = (runningRef.current && modeKey === "focus") ? (mode.duration - timeLeft) : 0;
  const liveElapsedBreak = (runningRef.current && modeKey !== "focus") ? (mode.duration - timeLeft) : 0;

  const totalFocusMin = sessions
    .filter((s) => s.type === "focus")
    .reduce((acc, s) => acc + s.duration / 60, 0) + (liveElapsedFocus / 60);

  const focusScoreRaw = Math.min(100, Math.round((todaySessions.filter((s) => s.type === "focus").length / 8) * 100));
  const focusScore = Math.max(0, focusScoreRaw - Math.floor(cognitiveDebt / 2));

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Timer className="w-6 h-6 text-lumina-pink" />
          Focus Timer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Pomodoro technique for deep work</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="p-8">
              {/* Mode tabs */}
              <div className="flex gap-2 mb-8 justify-center">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => switchMode(m.key)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                      modeKey === m.key
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Circular timer */}
              <div className="flex flex-col items-center gap-8">
                <div className="relative">
                  <svg width="220" height="220" className="-rotate-90">
                    {/* Track */}
                    <circle
                      cx="110" cy="110" r="90"
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="8"
                    />
                    {/* Progress */}
                    <circle
                      cx="110" cy="110" r="90"
                      fill="none"
                      stroke={modeKey === "focus" ? "#7c3aed" : modeKey === "short" ? "#06b6d4" : "#22c55e"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold tracking-tight font-outfit">
                      {formatTime(timeLeft)}
                    </span>
                    <span className={cn("text-sm font-medium mt-1", mode.color)}>{mode.label}</span>
                    {running && (
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] text-muted-foreground">Running</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={reset}
                    className="w-11 h-11 rounded-full"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => setRunning((r) => !r)}
                    className={cn(
                      "w-32 h-12 rounded-full text-base font-semibold gap-2",
                      running
                        ? "bg-secondary hover:bg-secondary/80"
                        : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30"
                    )}
                  >
                    {running ? <><Pause className="w-5 h-5" /> Pause</> : <><Play className="w-5 h-5" /> Start</>}
                  </Button>
                  <div className="w-11 h-11" /> {/* Spacer */}
                </div>
              </div>

              <div className={cn(
                "mt-8 p-4 rounded-xl text-center relative overflow-hidden transition-all duration-500",
                cognitiveDebt > 0 ? "bg-red-500/10 ring-1 ring-red-500/20" : "bg-secondary/20"
              )}>
                {cognitiveDebt > 30 && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
                )}
                <p className="text-xs text-muted-foreground">
                  {modeKey === "focus"
                    ? "📵 Put your phone away. Close distracting tabs. Focus for 25 minutes."
                    : "🚶 Stand up, stretch, grab water. Rest your eyes from the screen."}
                </p>
                {cognitiveDebt > 0 && (
                   <div className="mt-2 animate-bounce">
                      <p className="text-xs font-bold text-red-500">
                        ⚠ YOU SAID YOU WERE STUDYING. YOUR PHONE DISAGREES.
                      </p>
                      <p className="text-[10px] text-red-400 opacity-80">
                        Cognitive Debt: {cognitiveDebt}% — Focus to pay it off.
                      </p>
                   </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Social Comparison Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-lumina-blue" /> Comparison</span>
                <span className="text-xs text-muted-foreground">This Week</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockSocialData}>
                    <defs>
                      <linearGradient id="colorYou" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorFriends" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '12px' }}
                      labelStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
                    />
                    <Area type="monotone" dataKey="you" stroke="#7c3aed" fillOpacity={1} fill="url(#colorYou)" name="You" strokeWidth={2} />
                    <Area type="monotone" dataKey="friends" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFriends)" name="Friends Avg" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          {/* Score */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-lumina-purple/10">
                  <Zap className="w-4 h-4 text-lumina-purple" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Focus Score</div>
                  <div className="text-2xl font-bold gradient-text">{focusScore}/100</div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-secondary/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-lumina-purple to-lumina-blue transition-all duration-700"
                  style={{ width: `${focusScore}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {focusScore >= 80 ? "🔥 Excellent focus today!" :
                  focusScore >= 50 ? "💪 Keep going!" :
                    "Start a session to build your score"}
              </p>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Today's Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Sessions Done",
                  value: todaySessions.filter((s) => s.type === "focus").length,
                  icon: CheckCircle2,
                  color: "text-green-400",
                },
                {
                  label: "Focus Time",
                  value: `${Math.floor((todaySessions.filter((s) => s.type === "focus").reduce((a, s) => a + s.duration, 0) + liveElapsedFocus) / 60)}m`,
                  icon: Timer,
                  color: "text-lumina-purple",
                },
                {
                  label: "Break Time",
                  value: `${Math.floor((todaySessions.filter((s) => s.type === "break").reduce((a, s) => a + s.duration, 0) + liveElapsedBreak) / 60)}m`,
                  icon: Coffee,
                  color: "text-lumina-cyan",
                },
                {
                  label: "Cognitive Debt",
                  value: `${cognitiveDebt}%`,
                  icon: TrendingUp,
                  color: cognitiveDebt > 0 ? "text-red-400" : "text-green-400",
                }
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-3.5 h-3.5", color)} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <span className={cn("text-sm font-bold", color)}>{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Cognitive Tracking Graph */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-400" />
                Cognitive Debt Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={debtHistory.length > 0 ? debtHistory : [{time: 'Start', debt: 0}]}>
                    <defs>
                      <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '10px', color: '#ef4444' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="debt" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorDebt)" 
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                Real-time cognitive load based on app switching frequency.
              </p>
            </CardContent>
          </Card>

          {/* Interruption Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Focus Interruptions</CardTitle>
            </CardHeader>
            <CardContent>
              {switchTimeline.length === 0 ? (
                <div className="text-center py-4 border border-dashed rounded-lg">
                  <p className="text-[10px] text-muted-foreground">No interruptions logged yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {switchTimeline.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        item.type === "switch" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-green-500"
                      )} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-medium leading-none">
                            {item.type === "switch" ? "Tab Switch / Inactive" : "Returned to Session"}
                          </span>
                          <span className="text-[8px] text-muted-foreground">{item.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Simple All-time Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Total Deep Work</span>
                <span className="font-bold">{Math.round(totalFocusMin)}m</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
