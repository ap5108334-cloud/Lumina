"use client";

import { useEffect, useMemo, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { useAttendance } from "@/hooks/useAttendance";
import { useExpenses } from "@/hooks/useExpenses";
import { useTasks } from "@/hooks/useTasks";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getBunkInfo, getAttendanceColor, formatCurrency, cn } from "@/lib/utils";
import {
  Brain, FileText, BarChart2, Wallet, CheckSquare,
  TrendingUp, AlertTriangle, Zap, Sun, Star,
  Bell, Mail, GraduationCap, Shield, CheckCheck,
  ChevronRight, Clock, X,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import LaTeXWidget from "@/components/dashboard/LaTeXWidget";

const sourceConfig = {
  email: { icon: Mail, label: "Email", className: "source-email", color: "text-blue-400" },
  moodle: { icon: GraduationCap, label: "Moodle", className: "source-moodle", color: "text-orange-400" },
  system: { icon: Shield, label: "System", className: "source-system", color: "text-purple-400" },
};

const priorityConfig = {
  low: { color: "text-muted-foreground", bg: "bg-muted/30", label: "Low" },
  medium: { color: "text-lumina-blue", bg: "bg-blue-500/10", label: "Medium" },
  high: { color: "text-lumina-amber", bg: "bg-amber-500/10", label: "High" },
  urgent: { color: "text-red-400", bg: "bg-red-500/10", label: "Urgent" },
};

export default function Dashboard() {
  const { notes, fetchNotes } = useNotes();
  const { subjects, fetchSubjects } = useAttendance();
  const { expenses, fetchExpenses } = useExpenses();
  const { tasks, fetchTasks } = useTasks();
  const { alerts, fetchAlerts, markRead, markAllRead, deleteAlert } = useAlerts();
  const { user } = useAuth();
  const [alertFilter, setAlertFilter] = useState<"all" | "email" | "moodle" | "system">("all");
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    fetchNotes();
    fetchSubjects();
    fetchExpenses();
    fetchTasks();
    fetchAlerts();
  }, []);

  const today = format(new Date(), "EEEE, MMMM d");

  const avgAttendance = useMemo(() => {
    if (!subjects.length) return 0;
    return subjects.reduce((acc, s) => acc + (s.total ? (s.attended / s.total) * 100 : 0), 0) / subjects.length;
  }, [subjects]);

  const weeklyExpenses = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return expenses
      .filter((e) => new Date(e.date) >= weekAgo)
      .reduce((acc, e) => acc + e.amount, 0);
  }, [expenses]);

  const taskStats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    todo: tasks.filter((t) => t.status === "todo").length,
  }), [tasks]);

  const focusScore = useMemo(() => {
    const completedRatio = taskStats.total ? taskStats.done / taskStats.total : 0;
    const attendanceScore = avgAttendance / 100;
    return Math.round((completedRatio * 0.4 + attendanceScore * 0.6) * 100);
  }, [taskStats, avgAttendance]);

  const atRiskSubjects = subjects.filter((s) => {
    const { pct } = getBunkInfo(s.attended, s.total);
    return pct < 75 && s.total > 0;
  });

  const unreadAlerts = alerts.filter((a) => !a.read);
  const filteredAlerts = alerts.filter((a) => alertFilter === "all" || a.source === alertFilter);
  const displayAlerts = showAllAlerts ? filteredAlerts : filteredAlerts.slice(0, 5);

  const taskCompletion = taskStats.total ? (taskStats.done / taskStats.total) * 100 : 0;

  const stats = [
    {
      title: "Avg. Attendance",
      value: `${avgAttendance.toFixed(0)}%`,
      icon: BarChart2,
      color: avgAttendance >= 75 ? "text-green-500" : "text-red-500",
      bg: avgAttendance >= 75 ? "bg-green-500/10" : "bg-red-500/10",
      href: "/attendance",
      sub: `${subjects.length} subjects`,
    },
    {
      title: "Weekly Spend",
      value: formatCurrency(weeklyExpenses),
      icon: Wallet,
      color: "text-lumina-amber",
      bg: "bg-lumina-amber/10",
      href: "/expenses",
      sub: `${expenses.filter((e) => {
        const w = new Date(); w.setDate(w.getDate() - 7);
        return new Date(e.date) >= w;
      }).length} transactions`,
    },
    {
      title: "Tasks Progress",
      value: `${Math.round(taskCompletion)}%`,
      icon: CheckSquare,
      color: taskCompletion >= 50 ? "text-green-500" : "text-red-500",
      bg: taskCompletion >= 50 ? "bg-green-500/10" : "bg-red-500/10",
      href: "/attendance",
      sub: `${taskStats.done}/${taskStats.total} done`,
    },
    {
      title: "Notes",
      value: String(notes.length),
      icon: FileText,
      color: "text-lumina-blue",
      bg: "bg-lumina-blue/10",
      href: "/notes",
      sub: "in second brain",
    },
  ];

  const mockComparisonData = [
    { name: "Mon", you: 60, top: 75 },
    { name: "Tue", you: 70, top: 80 },
    { name: "Wed", you: 65, top: 85 },
    { name: "Thu", you: 80, top: 85 },
    { name: "Fri", you: 85, top: 90 },
    { name: "Sat", you: 60, top: 70 },
    { name: "Sun", you: 90, top: 95 },
  ];

  const greeting = new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening";

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Sun className="w-4 h-4 text-lumina-amber" />
            {today}
          </div>
          <h1 className="text-3xl font-bold">
            Good {greeting}, <span className="gradient-text">{user?.name?.split(" ")[0] || "Student"}</span> 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's your academic intelligence overview.</p>
        </div>
        <div className="text-right">
          <div className="relative">
            <div className="text-4xl font-bold gradient-text">{focusScore}</div>
            <div className="absolute -inset-2 bg-gradient-to-br from-lumina-purple/10 to-lumina-blue/10 rounded-xl blur-lg -z-10" />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Zap className="w-3 h-3 text-lumina-amber" />
            Focus Score
          </div>
        </div>
      </div>

      {/* Alert for at-risk subjects */}
      {atRiskSubjects.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5 animate-slideDown">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Attendance Alert</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {atRiskSubjects.map((s) => s.name).join(", ")} {atRiskSubjects.length === 1 ? "is" : "are"} below 75% — attend urgently!
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ title, value, icon: Icon, color, bg, href, sub }, i) => (
          <Link key={title} href={href}>
            <Card className="hover:border-primary/30 hover:bg-card/80 transition-all duration-300 cursor-pointer group hover-lift" style={{ animationDelay: `${i * 0.05}s` }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2.5 rounded-xl", bg)}>
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>
                  <TrendingUp className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div className="text-2xl font-bold mb-0.5">{value}</div>
                <div className="text-xs text-muted-foreground">{title}</div>
                <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alerts Section */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="relative">
                <Bell className="w-4 h-4 text-lumina-amber" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              Alerts & Notifications
              {unreadAlerts.length > 0 && (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                  {unreadAlerts.length} new
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {unreadAlerts.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary/50 transition-all"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>
          </div>
          {/* Source filter tabs */}
          <div className="flex gap-1.5 mt-3">
            {(["all", "email", "moodle", "system"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setAlertFilter(filter)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 capitalize",
                  alertFilter === filter
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                {filter === "all" ? `All (${alerts.length})` : 
                 `${filter} (${alerts.filter(a => a.source === filter).length})`}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {displayAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p>No alerts to show</p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayAlerts.map((alert, i) => {
                const source = sourceConfig[alert.source];
                const priority = priorityConfig[alert.priority];
                const SourceIcon = source.icon;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl transition-all duration-200 group cursor-pointer animate-fadeIn",
                      alert.read
                        ? "bg-transparent hover:bg-secondary/30"
                        : "bg-primary/5 hover:bg-primary/10 border border-primary/10"
                    )}
                    style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={() => !alert.read && markRead(alert.id)}
                  >
                    <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", source.className)}>
                      <SourceIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-medium line-clamp-1", !alert.read && "text-foreground")}>
                          {alert.title}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", priority.bg, priority.color)}>
                            {priority.label}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteAlert(alert.id); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={cn("text-[10px] font-medium flex items-center gap-1", source.color)}>
                          <SourceIcon className="w-2.5 h-2.5" />
                          {source.label}
                        </span>
                        {alert.category && (
                          <span className="text-[10px] text-muted-foreground/60 bg-secondary/50 px-1.5 py-0.5 rounded">
                            {alert.category}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1 ml-auto">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {!alert.read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {filteredAlerts.length > 5 && (
            <button
              onClick={() => setShowAllAlerts(!showAllAlerts)}
              className="w-full mt-3 py-2 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 rounded-lg hover:bg-secondary/30 transition-all"
            >
              {showAllAlerts ? "Show less" : `View all ${filteredAlerts.length} alerts`}
              <ChevronRight className={cn("w-3 h-3 transition-transform", showAllAlerts && "rotate-90")} />
            </button>
          )}
        </CardContent>
      </Card>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-lumina-green" />
              Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No subjects added yet
              </div>
            ) : (
              subjects.map((s) => {
                const { pct, safe } = getBunkInfo(s.attended, s.total);
                return (
                  <div key={s.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.name}</span>
                      <div className="flex items-center gap-2">
                        {safe > 0 && (
                          <span className="text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                            {safe} bunk{safe > 1 ? "s" : ""} safe
                          </span>
                        )}
                        <span className={cn("font-bold text-xs", getAttendanceColor(pct))}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1.5"
                      indicatorClassName={
                        pct >= 85 ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500"
                      }
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {s.attended}/{s.total} classes
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Tasks Kanban Mini */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-lumina-purple" />
              Tasks Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No tasks yet
              </div>
            ) : (
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Completion</span>
                    <span>{taskStats.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0}%</span>
                  </div>
                  <Progress
                    value={taskStats.total ? (taskStats.done / taskStats.total) * 100 : 0}
                    className="h-2"
                    indicatorClassName="bg-lumina-purple"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: "To Do", count: taskStats.todo, color: "text-muted-foreground", bg: "bg-muted/30" },
                    { label: "Doing", count: taskStats.doing, color: "text-lumina-amber", bg: "bg-amber-500/10" },
                    { label: "Done", count: taskStats.done, color: "text-lumina-green", bg: "bg-green-500/10" },
                  ].map(({ label, count, color, bg }) => (
                    <div key={label} className={cn("rounded-xl p-3 text-center", bg)}>
                      <div className={cn("text-xl font-bold", color)}>{count}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                {/* Recent tasks */}
                <div className="space-y-1 mt-2">
                  {tasks.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        t.status === "done" ? "bg-green-500" : t.status === "doing" ? "bg-amber-500" : "bg-muted-foreground"
                      )} />
                      <span className={cn("text-xs truncate", t.status === "done" && "line-through text-muted-foreground")}>
                        {t.title}
                      </span>
                      <Badge
                        variant={t.priority === "high" ? "destructive" : t.priority === "medium" ? "warning" : "outline"}
                        className="ml-auto text-[9px] py-0 px-1.5"
                      >
                        {t.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* You vs Top Student Compare */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-lumina-amber" />
              You vs. Top Student
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4 mt-1">
              <div className="flex-1 text-center py-2 bg-primary/10 rounded-xl">
                <span className="text-xs text-muted-foreground block mb-1">Your Score</span>
                <span className="text-2xl font-bold gradient-text">{focusScore}</span>
              </div>
              <div className="text-muted-foreground font-bold text-xs uppercase tracking-widest">VS</div>
              <div className="flex-1 text-center py-2 bg-amber-500/10 rounded-xl">
                <span className="text-xs text-muted-foreground block mb-1">Top Student</span>
                <span className="text-2xl font-bold text-lumina-amber">95</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-4 hidden">
              Estimated performance based on attendance and task velocity this week.
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockComparisonData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorYouDash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTop" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                    labelStyle={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}
                  />
                  <Area type="monotone" dataKey="top" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTop)" name="Top Student" strokeWidth={2} />
                  <Area type="monotone" dataKey="you" stroke="#7c3aed" fillOpacity={1} fill="url(#colorYouDash)" name="You" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group Projects Section (LaTeX Preview) */}
      <div className="grid grid-cols-1 gap-6">
        <LaTeXWidget />
      </div>

      {/* AI Insights */}
      <Card className="border-lumina-purple/20 bg-lumina-purple/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-lumina-purple" />
            AI Insights
            <Badge variant="default" className="text-[10px]">Smart</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                icon: Star,
                color: "text-lumina-amber",
                title: "Study Tip",
                msg: notes.length > 0
                  ? `You have ${notes.length} notes in your second brain. Review them regularly for better retention.`
                  : "Start adding notes to build your second brain. Consistent note-taking improves learning by 40%.",
              },
              {
                icon: BarChart2,
                color: "text-lumina-green",
                title: "Attendance",
                msg: avgAttendance >= 85
                  ? `Excellent! Your ${avgAttendance.toFixed(0)}% attendance gives you room for occasional absences.`
                  : avgAttendance >= 75
                  ? `Your attendance at ${avgAttendance.toFixed(0)}% is safe but tight. Avoid unnecessary bunks.`
                  : `⚠️ Attendance at ${avgAttendance.toFixed(0)}% is below threshold. Attend all classes now!`,
              },
              {
                icon: Wallet,
                color: "text-lumina-cyan",
                title: "Spending",
                msg: weeklyExpenses > 2000
                  ? `You've spent ${formatCurrency(weeklyExpenses)} this week. Consider reviewing discretionary expenses.`
                  : weeklyExpenses > 0
                  ? `Weekly spending of ${formatCurrency(weeklyExpenses)} looks manageable. Keep it up!`
                  : "No expenses logged this week. Start tracking to get spending insights.",
              },
            ].map(({ icon: Icon, color, title, msg }) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-background/40 hover-lift">
                <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", color)} />
                <div>
                  <p className="text-xs font-semibold mb-0.5">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{msg}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
