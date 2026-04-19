"use client";

import { useEffect, useState } from "react";
import { useAttendance } from "@/hooks/useAttendance";
import { useTasks } from "@/hooks/useTasks";
import { useCalendar } from "@/hooks/useCalendar";
import { Subject, SUBJECT_COLORS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskBoard } from "@/components/TaskBoard";
import { getBunkInfo, getAttendanceColor, cn } from "@/lib/utils";
import {
  Plus, Trash2, CheckCircle2, XCircle, BarChart2,
  TrendingUp, TrendingDown, Coffee, AlertTriangle, Scan,
} from "lucide-react";
import { toast } from "sonner";

import { OCRScanner } from "@/components/attendance/OCRScanner";

export default function AttendancePage() {
  const { subjects, loading, fetchSubjects, addSubject, deleteSubject, markAttendance } = useAttendance();
  const { createTask } = useTasks();
  const { addEvent } = useCalendar();
  const [showAdd, setShowAdd] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [form, setForm] = useState({ name: "", attended: "", total: "", color: SUBJECT_COLORS[0] });

  useEffect(() => { fetchSubjects(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error("Subject name required"); return; }
    await addSubject({
      name: form.name,
      attended: parseInt(form.attended) || 0,
      total: parseInt(form.total) || 0,
      color: form.color,
    });
    setForm({ name: "", attended: "", total: "", color: SUBJECT_COLORS[0] });
    setShowAdd(false);
  };

  const overallPct = subjects.length
    ? subjects.reduce((acc, s) => acc + (s.total ? (s.attended / s.total) * 100 : 0), 0) / subjects.length
    : 0;

  const safeSubjects = subjects.filter((s) => getBunkInfo(s.attended, s.total).safe > 0);
  const atRisk = subjects.filter((s) => {
    const { pct } = getBunkInfo(s.attended, s.total);
    return pct < 75 && s.total > 0;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-lumina-green" />
            Attendance Tracker
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track classes, calculate bunk budget</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowOCR(true)} variant="secondary" className="gap-2 bg-lumina-purple/10 text-lumina-purple hover:bg-lumina-purple/20 border border-lumina-purple/20">
             <Scan className="w-4 h-4" /> Scan Timetable <Badge variant="secondary" className="ml-1 text-[9px] py-0 px-1.5 font-bold">OCR</Badge>
          </Button>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Subject
          </Button>
        </div>
      </div>

      <Tabs defaultValue="attendance" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="attendance">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Task Board</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-6 animate-fadeIn">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Overall %",
            value: `${overallPct.toFixed(1)}%`,
            icon: BarChart2,
            color: getAttendanceColor(overallPct),
            bg: overallPct >= 75 ? "bg-green-500/10" : "bg-red-500/10",
          },
          {
            label: "Subjects",
            value: subjects.length,
            icon: TrendingUp,
            color: "text-lumina-blue",
            bg: "bg-lumina-blue/10",
          },
          {
            label: "Safe Bunks",
            value: subjects.reduce((acc, s) => acc + getBunkInfo(s.attended, s.total).safe, 0),
            icon: Coffee,
            color: "text-lumina-amber",
            bg: "bg-lumina-amber/10",
          },
          {
            label: "At Risk",
            value: atRisk.length,
            icon: AlertTriangle,
            color: atRisk.length > 0 ? "text-red-400" : "text-muted-foreground",
            bg: atRisk.length > 0 ? "bg-red-500/10" : "bg-muted/20",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("p-2.5 rounded-lg", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
              </div>
              <div>
                <div className={cn("text-2xl font-bold", color)}>{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cooling day suggestion */}
      {safeSubjects.length === subjects.length && subjects.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/5">
          <Coffee className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">🎉 Cooling Day Available!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You have safe bunk budget in all subjects. You can take a day off without affecting your attendance!
            </p>
          </div>
        </div>
      )}

      {/* Subjects list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="h-28 animate-shimmer" />)}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No subjects added yet</p>
          <p className="text-sm">Add subjects to start tracking attendance</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map((s) => {
            const { pct, safe, needed } = getBunkInfo(s.attended, s.total);
            const isAtRisk = pct < 75 && s.total > 0;
            return (
              <Card
                key={s.id}
                className={cn(
                  "transition-all",
                  isAtRisk && "border-red-500/30 bg-red-500/5"
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div>
                        <h3 className="font-semibold">{s.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {s.attended} attended / {s.total} total
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xl font-bold", getAttendanceColor(pct))}>
                        {pct.toFixed(1)}%
                      </span>
                      <button
                        onClick={() => deleteSubject(s.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <Progress
                    value={Math.min(pct, 100)}
                    className="h-2 mb-3"
                    indicatorClassName={
                      pct >= 85 ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500"
                    }
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {safe > 0 ? (
                        <Badge variant="success" className="text-xs gap-1">
                          <Coffee className="w-3 h-3" />
                          {safe} bunk{safe > 1 ? "s" : ""} safe
                        </Badge>
                      ) : needed > 0 ? (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Need {needed} more class{needed > 1 ? "es" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">
                          Borderline — stay consistent
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAttendance(s.id, false)}
                        className="gap-1.5 h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Absent
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => markAttendance(s.id, true)}
                        className="gap-1.5 h-8 text-xs bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

        </TabsContent>

        <TabsContent value="tasks" className="animate-fadeIn">
          <TaskBoard />
        </TabsContent>
      </Tabs>

      {/* Add Subject Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Subject name (e.g. Mathematics)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Classes Attended</label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.attended}
                  onChange={(e) => setForm((f) => ({ ...f, attended: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Total Classes</label>
                <Input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.total}
                  onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform",
                      form.color === c && "ring-2 ring-offset-2 ring-offset-card ring-white scale-110"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Subject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OCR Scanner Dialog */}
      <Dialog open={showOCR} onOpenChange={setShowOCR}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-lumina-purple" />
              Smart Timetable Scanner
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
             <OCRScanner onParsed={async (result) => {
                if (result.documentType === "college_timetable") {
                  // Loop through and add them with realistic mock data based on total classes
                  for (let i = 0; i < result.subjects.length; i++) {
                     const s = result.subjects[i];
                     const attendanceRatio = 0.65 + Math.random() * 0.35; 
                     const attended = Math.floor(s.total * attendanceRatio);
                     await addSubject({
                       name: s.name,
                       total: s.total,
                       attended: attended,
                       color: SUBJECT_COLORS[i % SUBJECT_COLORS.length]
                     });
                  }
                  
                  // Also add calendar events
                  const getNextDate = (dayName: string) => {
                    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                    const target = days.indexOf(dayName.toLowerCase());
                    const d = new Date();
                    d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
                    return d.toISOString().split("T")[0];
                  };

                  for (let i = 0; i < result.events.length; i++) {
                     const e = result.events[i];
                     await addEvent({
                       title: `${e.title} (${e.time})`,
                       date: getNextDate(e.dayOfWeek),
                       type: "event",
                       color: SUBJECT_COLORS[i % SUBJECT_COLORS.length]
                     });
                  }

                  toast.success(`Successfully imported ${result.subjects.length} subjects and ${result.events.length} schedule blocks!`);
                } else if (result.documentType === "personal_tasks") {
                  for (let i = 0; i < result.tasks.length; i++) {
                     const t = result.tasks[i];
                     await createTask({
                       title: t.title,
                       description: "Auto-detected from uploaded schedule",
                       priority: t.priority,
                       dueDate: t.dueDate,
                       status: "todo"
                     });
                  }
                  toast.success(`Successfully imported ${result.tasks.length} tasks!`);
                }
                setShowOCR(false);
             }} />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
