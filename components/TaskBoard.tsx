"use client";

import { useEffect, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useAttendance } from "@/hooks/useAttendance";
import { Task, TaskStatus, TaskMessage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";
import {
  Plus, Trash2, CheckSquare, Circle, ArrowRight, Calendar, Flag, MessageCircle, Send, BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { randomUUID } from "crypto";

const COLUMNS: { key: TaskStatus; label: string; color: string; bg: string; dot: string }[] = [
  { key: "todo", label: "To Do", color: "text-muted-foreground", bg: "bg-secondary/30", dot: "bg-muted-foreground" },
  { key: "doing", label: "In Progress", color: "text-lumina-amber", bg: "bg-amber-500/10", dot: "bg-amber-500" },
  { key: "done", label: "Done", color: "text-lumina-green", bg: "bg-green-500/10", dot: "bg-green-500" },
];

const PRIORITY_COLORS = {
  low: "text-muted-foreground",
  medium: "text-lumina-amber",
  high: "text-red-400",
};

const PRIORITY_BG = {
  low: "bg-muted/20 text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-red-500/15 text-red-400",
};

export function TaskBoard() {
  const { tasks, loading, fetchTasks, createTask, updateTask, deleteTask, moveTask } = useTasks();
  const { subjects, fetchSubjects } = useAttendance();
  const [showNew, setShowNew] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "discussion">("details");
  const [newMessage, setNewMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo" as TaskStatus,
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
    subjectId: "none",
    discussion: [] as TaskMessage[],
  });

  useEffect(() => { 
    fetchTasks();
    fetchSubjects();
  }, []);

  const openNew = () => {
    setForm({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", subjectId: "none", discussion: [] });
    setActiveTab("details");
    setShowNew(true);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || "",
      subjectId: task.subjectId || "none",
      discussion: task.discussion || [],
    });
    setActiveTab("details");
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    await createTask({ ...form, subjectId: form.subjectId === "none" ? undefined : form.subjectId });
    setShowNew(false);
  };

  const handleUpdate = async () => {
    if (!editTask) return;
    if (!form.title.trim()) { toast.error("Title required"); return; }
    await updateTask({ id: editTask.id, ...form, subjectId: form.subjectId === "none" ? undefined : form.subjectId });
    setEditTask(null);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg: TaskMessage = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      name: "You",
      content: newMessage,
      timestamp: new Date().toISOString(),
    };
    setForm((f) => ({ ...f, discussion: [...f.discussion, msg] }));
    setNewMessage("");
  };

  const getNextStatus = (current: TaskStatus): TaskStatus => {
    if (current === "todo") return "doing";
    if (current === "doing") return "done";
    return "todo";
  };

  const grouped = {
    todo: tasks.filter((t) => t.status === "todo"),
    doing: tasks.filter((t) => t.status === "doing"),
    done: tasks.filter((t) => t.status === "done"),
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-lumina-purple" />
            Task Board
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tasks.filter((t) => t.status === "done").length}/{tasks.length} tasks completed
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Card key={i} className="h-60 animate-shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map(({ key, label, color, bg, dot }) => {
            const colTasks = grouped[key];
            return (
              <div key={key}>
                {/* Column header */}
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg mb-3", bg)}>
                  <div className={cn("w-2 h-2 rounded-full", dot)} />
                  <span className={cn("text-sm font-semibold", color)}>{label}</span>
                  <span className="ml-auto text-xs text-muted-foreground bg-background/40 px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-2 min-h-[120px]">
                  {colTasks.length === 0 && (
                    <div className="border-2 border-dashed border-border/30 rounded-xl h-20 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground/50">No tasks</p>
                    </div>
                  )}
                  {colTasks.map((task) => {
                    const taskSubject = subjects.find(s => s.id === task.subjectId);
                    return (
                      <Card
                        key={task.id}
                        className={cn(
                          "cursor-pointer hover:border-border/80 transition-all duration-150 group",
                          task.status === "done" && "opacity-60"
                        )}
                        onClick={() => openEdit(task)}
                      >
                        <CardContent className="p-3.5">
                          <div className="flex items-start gap-2 mb-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveTask(task.id, getNextStatus(task.status));
                              }}
                              className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {task.status === "done" ? (
                                <CheckSquare className="w-4 h-4 text-green-500" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <p className={cn(
                              "text-sm font-medium leading-snug flex-1",
                              task.status === "done" && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </p>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 ml-6">
                              {task.description}
                            </p>
                          )}

                          {taskSubject && (
                            <div className="mb-2 ml-6 flex items-center gap-2 flex-wrap">
                              <span 
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-secondary text-foreground inline-flex items-center gap-1"
                                style={{ borderLeft: `2px solid ${taskSubject.color}` }}
                              >
                                <BookOpen className="w-2.5 h-2.5" />
                                {taskSubject.name}
                              </span>
                              {task.attendancePercent !== undefined && (
                                <span className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1",
                                  task.attendancePercent >= 75 ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"
                                )}>
                                  {task.attendancePercent}% 
                                </span>
                              )}
                              {task.safeBunks !== undefined && (
                                <span className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1",
                                  task.safeBunks >= 0 ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-red-500/15 text-red-600 dark:text-red-400"
                                )}>
                                  {task.safeBunks >= 0 ? `${task.safeBunks} safe` : `${Math.abs(task.safeBunks)} short`}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 ml-6 flex-wrap">
                            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", PRIORITY_BG[task.priority])}>
                              <Flag className="w-2.5 h-2.5 inline mr-0.5" />
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                            {task.discussion && task.discussion.length > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <MessageCircle className="w-2.5 h-2.5" />
                                {task.discussion.length}
                              </span>
                            )}
                            {task.status !== "done" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); moveTask(task.id, getNextStatus(task.status)); }}
                                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                              >
                                Move <ArrowRight className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New / Edit Task Dialog */}
      {[
        { open: showNew, onClose: () => setShowNew(false), onSave: handleCreate, title: "New Task" },
        { open: !!editTask, onClose: () => setEditTask(null), onSave: handleUpdate, title: "Edit Task" },
      ].map(({ open, onClose, onSave, title }) => (
        <Dialog key={title} open={open} onOpenChange={onClose}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            {title === "Edit Task" && (
              <div className="flex items-center gap-4 border-b border-border mb-4">
                <button
                  className={cn("pb-2 text-sm font-medium border-b-2 transition-colors", activeTab === "details" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                  onClick={() => setActiveTab("details")}
                >
                  Details
                </button>
                <button
                  className={cn("pb-2 text-sm font-medium border-b-2 transition-colors", activeTab === "discussion" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                  onClick={() => setActiveTab("discussion")}
                >
                  Discussion
                </button>
              </div>
            )}

            {activeTab === "details" && (
              <div className="space-y-4">
                <Input
                  placeholder="Task title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Subject Link (Optional)</label>
                  <Select value={form.subjectId} onValueChange={(v) => setForm(f => ({ ...f, subjectId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Link to a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Priority</label>
                    <Select
                      value={form.priority}
                      onValueChange={(v: "low" | "medium" | "high") => setForm((f) => ({ ...f, priority: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
                    <Select
                      value={form.status}
                      onValueChange={(v: TaskStatus) => setForm((f) => ({ ...f, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="doing">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Due Date (optional)</label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {activeTab === "discussion" && title === "Edit Task" && (
              <div className="flex flex-col h-[400px]">
                <ScrollArea className="flex-1 pr-4 mb-4">
                  {form.discussion.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      No messages yet. Start a discussion!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {form.discussion.map(msg => (
                        <div key={msg.id} className={cn("flex flex-col", msg.sender === "user" ? "items-end" : "items-start")}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold">{msg.name}</span>
                            <span className="text-[9px] text-muted-foreground">{formatDate(msg.timestamp)}</span>
                          </div>
                          <div className={cn(
                            "px-3 py-2 rounded-xl max-w-[80%] text-sm",
                            msg.sender === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary rounded-tl-sm"
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2 items-center border-t border-border pt-4">
                  <Input 
                    placeholder="Type a message..." 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if(e.key === "Enter") handleSendMessage(); }}
                    className="flex-1 bg-secondary/30"
                  />
                  <Button size="icon" onClick={handleSendMessage}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave}>{title === "New Task" ? "Create" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}
