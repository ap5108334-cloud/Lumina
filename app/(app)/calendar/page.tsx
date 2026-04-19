"use client";

import { useEffect, useState, useMemo } from "react";
import { useCalendar } from "@/hooks/useCalendar";
import { useTasks } from "@/hooks/useTasks";
import { useAlerts } from "@/hooks/useAlerts";
import { CalendarEvent } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, addDays, parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar, Edit2, RefreshCcw, Inbox, Mail, GraduationCap, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const EVENT_COLORS = ["#7c3aed", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

export default function CalendarPage() {
  const { events, loading, fetchEvents, addEvent, deleteEvent } = useCalendar();
  const { tasks, fetchTasks, moveTask } = useTasks();
  const { alerts, fetchAlerts } = useAlerts();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  
  // Reuse same form for Add and Edit
  const [isEditingEvent, setIsEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    title: "",
    date: format(new Date(), "yyyy-MM-dd"),
    type: "event",
    color: EVENT_COLORS[0],
    description: "",
  });

  useEffect(() => {
    fetchEvents();
    fetchTasks();
    fetchAlerts();
    handleSyncFromAlerts();
  }, []);

  // Convert alerts with deadlines into calendar-displayable items
  const alertEvents = useMemo(() => {
    return alerts
      .filter((a) => a.timestamp)
      .map((a) => ({
        id: `alert-${a.id}`,
        title: a.title,
        date: a.timestamp.split("T")[0],
        type: "reminder" as const,
        color: a.source === "moodle" ? "#f97316" : a.source === "email" ? "#3b82f6" : "#7c3aed",
        description: `[${a.source.toUpperCase()}] ${a.message}`,
        source: a.source,
      }));
  }, [alerts]);

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    
    if (isEditingEvent && events.find((e) => e.id === isEditingEvent.id)) {
      // It's a local event, so we delete old and add new (Simulating edit via addEvent)
      await deleteEvent(isEditingEvent.id);
      await addEvent({ ...form, type: form.type as "event" | "task" | "reminder" });
      toast.success("Event updated");
    } else if (isEditingEvent) {
      toast.error("Cannot edit task synced from other modules here.");
    } else {
      await addEvent({ ...form, type: form.type as "event" | "task" | "reminder" });
    }
    
    setForm({ title: "", date: format(new Date(), "yyyy-MM-dd"), type: "event", color: EVENT_COLORS[0], description: "" });
    setShowAdd(false);
    setIsEditingEvent(null);
  };

  const openAddForDay = (day: Date) => {
    setSelectedDay(day);
    setIsEditingEvent(null);
    setForm((f) => ({ ...f, date: format(day, "yyyy-MM-dd"), title: "" }));
    setShowAdd(true);
  };

  const openEditEvent = (ev: any) => {
    setIsEditingEvent(ev);
    setForm({
      title: ev.title,
      date: ev.date,
      type: ev.type,
      color: ev.color || EVENT_COLORS[0],
      description: ev.description || "",
    });
    setShowAdd(true);
  };

  const handleSyncFromAlerts = async () => {
    setSyncing(true);
    toast.info("Syncing deadlines from Moodle & Gmail alerts...", { duration: 1500 });
    
    await new Promise((r) => setTimeout(r, 1500));
    
    // Pull unread alerts that look like deadlines and add them as calendar events
    const deadlineKeywords = ["deadline", "due", "submit", "assignment", "exam", "quiz", "test", "review", "presentation", "project"];
    const relevantAlerts = alerts.filter((a) => {
      const text = (a.title + " " + a.message).toLowerCase();
      return (a.source === "moodle" || a.source === "email") && deadlineKeywords.some((kw) => text.includes(kw));
    });
    
    let added = 0;
    for (const alert of relevantAlerts) {
      // Check if already synced by matching title
      const alreadyExists = events.some((e) => e.title === alert.title);
      if (alreadyExists) continue;
      
      // Use alert timestamp or offset from today for the deadline
      const deadlineDate = alert.timestamp
        ? alert.timestamp.split("T")[0]
        : format(addDays(new Date(), 3), "yyyy-MM-dd");
      
      await addEvent({
        title: alert.title,
        date: deadlineDate,
        type: "task",
        color: alert.source === "moodle" ? "#f97316" : "#3b82f6",
        description: `[${alert.source.toUpperCase()}] ${alert.message}`,
      });
      added++;
    }
    
    if (added > 0) {
      toast.success(`${added} deadline${added > 1 ? "s" : ""} synced from alerts!`);
    } else {
      toast.info("All deadlines already synced. No new items found.");
    }
    setSyncing(false);
  };

  // Build calendar days
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const days = view === "month" ? monthDays : weekDays;

  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const calEvents = events.filter((e) => e.date.startsWith(dayStr));
    const taskEvents = tasks
      .filter((t) => t.dueDate && t.dueDate.startsWith(dayStr))
      .map((t) => ({
        id: t.id,
        title: t.title,
        date: t.dueDate!,
        type: "task" as const,
        color: t.status === "done" ? "#22c55e" : t.status === "doing" ? "#f59e0b" : "#7c3aed",
        description: `Status: ${t.status} | Priority: ${t.priority}`,
        taskStatus: t.status,
      }));
    const dayAlertEvents = alertEvents.filter((ae) => ae.date === dayStr);
    return [...calEvents, ...taskEvents, ...dayAlertEvents];
  };

  const getIntensity = (count: number) => {
    if (count === 0) return "text-foreground";
    if (count < 2) return "text-foreground";
    if (count <= 4) return "text-foreground";
    return "text-foreground";
  };

  /** Get inline heatmap background style for a day cell */
  const getHeatmapStyle = (count: number): React.CSSProperties => {
    if (count === 0) return {}; // default card bg
    if (count < 2) return { backgroundColor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)" }; // subtle off-white
    if (count <= 4) return { backgroundColor: "rgba(250, 204, 21, 0.25)", boxShadow: "inset 0 0 15px rgba(250, 204, 21, 0.15)" }; // distinct yellow
    return { backgroundColor: "rgba(239, 68, 68, 0.3)", boxShadow: "inset 0 0 25px rgba(239, 68, 68, 0.2)" }; // vibrant red
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-lumina-blue" />
            Calendar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Workload Heatmap & Events</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncFromAlerts} 
            disabled={syncing}
            className="gap-2 border-lumina-blue/30 text-lumina-blue hover:bg-lumina-blue/10"
          >
            <RefreshCcw className={cn("w-3 h-3", syncing && "animate-spin")} />
            Sync Email/Moodle
          </Button>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors capitalize",
                  view === v ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button onClick={() => { setIsEditingEvent(null); setShowAdd(true); }} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Workload Heatmap:</span>
        {[
          { label: "Free", style: { backgroundColor: "transparent", border: "1px solid hsl(var(--border))" } },
          { label: "Light (<2)", style: { backgroundColor: "rgba(250, 245, 235, 0.3)", border: "1px solid rgba(250, 245, 235, 0.5)" } },
          { label: "Moderate (2-4)", style: { backgroundColor: "rgba(250, 204, 21, 0.35)", border: "1px solid rgba(250, 204, 21, 0.5)" } },
          { label: "Heavy (5+)", style: { backgroundColor: "rgba(239, 68, 68, 0.4)", border: "1px solid rgba(239, 68, 68, 0.5)" } },
        ].map(({ label, style }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-sm" style={style} />
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <Mail className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] text-muted-foreground">Email</span>
          <GraduationCap className="w-3 h-3 text-orange-400 ml-2" />
          <span className="text-[10px] text-muted-foreground">Moodle</span>
        </div>
      </div>

      <Card className="overflow-hidden border-border/50">
        <CardHeader className="pb-3 border-b border-border/50 bg-secondary/5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              {view === "month"
                ? format(currentDate, "MMMM yyyy")
                : `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-lg"
                onClick={() =>
                  setCurrentDate((d) => (view === "month" ? subMonths(d, 1) : new Date(d.setDate(d.getDate() - 7))))
                }
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs rounded-lg"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 rounded-lg"
                onClick={() =>
                  setCurrentDate((d) => (view === "month" ? addMonths(d, 1) : new Date(d.setDate(d.getDate() + 7))))
                }
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/50 bg-secondary/10">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-3">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border/50 rounded-b-xl overflow-hidden">
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const todayDay = isToday(day);
              const intensityClass = getIntensity(dayEvents.length);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date("invalid")) ? null : day)}
                  style={getHeatmapStyle(dayEvents.length)}
                  className={cn(
                    "min-h-[90px] p-2 cursor-pointer transition-all duration-200 border-r border-b border-border/50",
                    intensityClass,
                    !isCurrentMonth && "opacity-30 grayscale",
                    isSelected && "ring-2 ring-inset ring-primary z-10 shadow-lg scale-105 rounded-lg border-none"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className={cn(
                      "w-7 h-7 flex items-center justify-center text-xs font-bold rounded-full mb-1.5",
                      todayDay ? "bg-primary text-primary-foreground shadow-sm" : ""
                    )}>
                      {format(day, "d")}
                    </div>
                    {dayEvents.length > 0 && (
                      <span className="text-[9px] font-medium text-muted-foreground/80 hidden sm:block">
                        {dayEvents.length} items
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[9px] truncate px-1.5 py-0.5 rounded-sm font-medium transition-transform hover:scale-[1.02]"
                        style={{ backgroundColor: `${ev.color}20`, color: ev.color, borderLeft: `2px solid ${ev.color}` }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground pl-1 font-medium">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected day events panel */}
          {selectedDay && (
            <div className="p-4 sm:p-6 bg-card border-t border-border/50 animate-slideUp">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">
                    {format(selectedDay, "EEEE")}
                  </h3>
                  <p className="text-sm text-muted-foreground">{format(selectedDay, "MMMM d, yyyy")}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openAddForDay(selectedDay)}
                  className="gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Add New
                </Button>
              </div>
              
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-dashed border-border/50 bg-secondary/10">
                  <Inbox className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Your schedule is clear for this day.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedDayEvents.map((ev: any) => {
                    const isLocalEvent = !!events.find((e) => e.id === ev.id);
                    const isTask = !isLocalEvent && !ev.id.startsWith("alert-") && !!tasks.find((t) => t.id === ev.id);
                    const isAlert = ev.id.startsWith("alert-");
                    return (
                      <div 
                        key={ev.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all group",
                          isLocalEvent
                            ? "border-border/50 bg-secondary/10 hover:border-border"
                            : isAlert
                            ? "border-blue-500/20 bg-blue-500/5"
                            : "border-lumina-purple/20 bg-lumina-purple/5"
                        )}
                      >
                        <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold truncate leading-tight">{ev.title}</span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-background shadow-sm ml-auto capitalize">
                              {isAlert ? (ev as any).source || "alert" : ev.type}
                            </Badge>
                          </div>
                          {isTask && <p className="text-[10px] text-muted-foreground">Linked from Tasks — <span className="capitalize font-medium">{ev.taskStatus}</span></p>}
                          {isAlert && <p className="text-[10px] text-muted-foreground flex items-center gap-1">{(ev as any).source === "moodle" ? <GraduationCap className="w-2.5 h-2.5 text-orange-400" /> : <Mail className="w-2.5 h-2.5 text-blue-400" />}From {(ev as any).source}</p>}
                          {ev.description && <p className="text-[10px] text-muted-foreground truncate">{ev.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Task status toggle */}
                          {isTask && (
                            <button
                              onClick={() => {
                                const task = tasks.find((t) => t.id === ev.id);
                                if (!task) return;
                                const next = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo";
                                moveTask(task.id, next);
                                toast.success(`Task marked as ${next}`);
                              }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:bg-green-500/10 hover:text-green-500 transition-all"
                              title="Toggle task status"
                            >
                              {ev.taskStatus === "done" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4" />}
                            </button>
                          )}
                          {isLocalEvent && (
                            <>
                              <button
                                onClick={() => openEditEvent(ev)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteEvent(ev.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Event Dialog */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if(!open) setIsEditingEvent(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingEvent ? "Edit Event" : "Add Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="font-medium"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Date</label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Type</label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="reminder">Reminder</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Description (optional)</label>
              <Input
                placeholder="Details, location, etc."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Color Label</label>
              <div className="flex gap-2">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all shadow-sm duration-200",
                      form.color === c ? "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110" : "opacity-80 hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>{isEditingEvent ? "Save Changes" : "Create Event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
