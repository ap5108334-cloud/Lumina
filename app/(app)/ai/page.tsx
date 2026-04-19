"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChatMessage, Note, NoteAttachment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain, Send, Trash2, FileText, Loader2, User, Sparkles, AlertCircle,
  Plus, Search, Edit2, Tag, Clock, Upload, File, Image, FileType, 
  X, Sparkles as SparklesIcon, BookOpen, GitBranch, ListChecks, 
  Paperclip, Download, Eye, TrendingUp, ChevronRight, Copy, Maximize2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useNotes } from "@/hooks/useNotes";
import * as aiUtils from "@/lib/ai-utils";

const SUGGESTIONS = [
  "Summarize my recent notes",
  "Explain the Pomodoro technique",
  "Help me make a study plan",
  "Create a flowchart from my notes",
  "How to improve focus and productivity?",
  "What are effective note-taking strategies?",
];

export default function AIPage() {
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [useNotesContext, setUseNotesContext] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Notes State (Knowledge Base)
  const { notes, loading: notesLoading, fetchNotes, createNote, updateNote, deleteNote } = useNotes();
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", content: "", tags: "" });
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [aiToolMode, setAiToolMode] = useState<"summary" | "revision" | "flowchart" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
    fetchNotes();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (aiResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [aiResult]);

  // ──────────────────────────────────────────────
  // Chat Functions
  // ──────────────────────────────────────────────

  const loadChatHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/ai/chat");
      const data = await res.json();
      setMessages(data);
    } catch {
      toast.error("Failed to load chat history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const sendMessage = async (msg?: string) => {
    const text = msg || input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    const tempUserMsg: ChatMessage = {
      id: "temp-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, useNotes: useNotesContext }),
      });
      const data = await res.json();
      setMessages(data.history || []);
    } catch {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    try {
      await fetch("/api/ai/chat", { method: "DELETE" });
      setMessages([]);
      toast.success("Chat cleared");
    } catch {
      toast.error("Failed to clear chat");
    }
  };

  // ──────────────────────────────────────────────
  // Notes Functions
  // ──────────────────────────────────────────────

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const handleFileUpload = useCallback(async (files: FileList | globalThis.File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} too large`); continue; }
      try {
        const [dataUrl, textContent] = await Promise.all([
          aiUtils.fileToDataUrl(file),
          aiUtils.extractTextFromFile(file),
        ]);
        const attachment: NoteAttachment = {
          id: Math.random().toString(36).slice(2),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
          textContent,
        };
        setAttachments((prev) => [...prev, attachment]);
        toast.success(`Attached "${file.name}"`);
      } catch {
        toast.error(`Failed to process "${file.name}"`);
      }
    }
  }, []);

  const handleCreateNote = async () => {
    if (!noteForm.title.trim()) return toast.error("Title required");
    const tags = noteForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
    await createNote({ title: noteForm.title, content: noteForm.content, tags, attachments });
    setNoteForm({ title: "", content: "", tags: "" });
    setAttachments([]);
    setShowNewNote(false);
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;
    const tags = noteForm.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const allAttachments = [...(selectedNote.attachments || []), ...attachments];
    await updateNote({ id: selectedNote.id, title: noteForm.title, content: noteForm.content, tags, attachments: allAttachments });
    setEditingNote(false);
    setSelectedNote(null);
    setAttachments([]);
  };

  const processWithAI = async (mode: "summary" | "revision" | "flowchart") => {
    if (!selectedNote) return;
    setAiProcessing(true);
    setAiToolMode(mode);
    setAiResult("");

    let fullText = selectedNote.content;
    selectedNote.attachments?.forEach((att) => { if (att.textContent) fullText += "\n\n" + att.textContent; });

    await new Promise((resolve) => setTimeout(resolve, 800));
    let result = "";
    if (mode === "summary") result = aiUtils.generateSummary(fullText, selectedNote.title);
    else if (mode === "revision") result = aiUtils.generateRevisionNotes(fullText, selectedNote.title);
    else result = aiUtils.generateFlowchart(fullText, selectedNote.title);

    setAiResult(result);
    setAiProcessing(false);
  };

  return (
    <div className="min-h-screen flex flex-col gap-6 animate-fadeIn pb-20">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h1 className="text-2xl font-medium tracking-tight flex items-center gap-3">
            <Brain className="w-10 h-10 text-lumina-cyan" />
            Intelligence Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-2 font-medium">Your Second Brain & AI Research Partner</p>
        </div>
      </div>

      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-8 h-14 p-1 bg-secondary/30 rounded-2xl sticky top-2 z-50 backdrop-blur-xl">
          <TabsTrigger value="chat" className="gap-3 rounded-xl border border-transparent data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:border-border/50 transition-all font-medium">
            <Brain className="w-5 h-5 text-lumina-cyan" /> AI Assistant
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-3 rounded-xl border border-transparent data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:border-border/50 transition-all font-medium">
            <FileText className="w-5 h-5 text-lumina-purple" /> Knowledge Base
          </TabsTrigger>
        </TabsList>

        {/* ────────── CHAT TAB ────────── */}
        <TabsContent value="chat" className="flex-1 flex flex-col gap-6 data-[state=active]:animate-slideIn">
          <Card className="flex-1 flex flex-col border-border/50 bg-card/10 backdrop-blur-xl min-h-[700px] rounded-[2.5rem] overflow-hidden">
            <CardHeader className="py-4 px-8 border-b border-border/50 flex flex-row items-center justify-between bg-background/20 sticky top-0 z-10 backdrop-blur-3xl">
              <div className="flex items-center gap-4">
                 <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs px-3 h-8 uppercase font-medium tracking-widest">
                   Offline Llama-3
                 </Badge>
                 <Badge variant="outline" className={cn(
                   "text-xs px-3 h-8 uppercase font-medium tracking-widest transition-all",
                   useNotesContext ? "bg-lumina-blue/20 text-lumina-blue border-lumina-blue/40" : "bg-muted/30 text-muted-foreground"
                 )}>
                   <FileText className="w-3 h-3 mr-1.5" /> Context: {useNotesContext ? "Active" : "Off"}
                 </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setUseNotesContext((n) => !n)}
                   className={cn("h-9 font-medium px-4 transition-all rounded-xl border-border/50", useNotesContext && "bg-lumina-blue/20 text-lumina-blue border-lumina-blue/40")}
                >
                  {useNotesContext ? "Unlink Notes" : "Link My Records"}
                </Button>
                {messages.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearHistory} className="h-9 px-3 text-muted-foreground hover:text-red-400 font-medium">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <div className="flex-1 p-8 overflow-y-auto min-h-[500px]">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center h-96 gap-6">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="font-medium text-muted-foreground uppercase tracking-widest text-xs">Booting AI Engine...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-12">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-lumina-cyan to-lumina-purple flex items-center justify-center shadow-2xl shadow-primary/20">
                      <Brain className="w-16 h-16 text-white" />
                    </div>
                    <div className="absolute -inset-8 bg-gradient-to-br from-lumina-cyan/20 to-lumina-purple/20 rounded-full blur-3xl opacity-50 animate-pulse" />
                  </div>
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">What's the mission?</h2>
                    <p className="text-muted-foreground max-w-lg mx-auto text-lg font-medium opacity-80">Your private, local research assistant. Reference your notes or start a fresh thread.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl px-4">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="group flex items-center justify-between p-6 rounded-3xl border border-border/50 bg-secondary/10 hover:border-primary/50 hover:bg-primary/5 hover:scale-[1.02] transition-all text-left"
                      >
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{s}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-10 max-w-4xl mx-auto pb-10">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn("flex gap-6", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-1 shadow-lg border border-white/10",
                        msg.role === "user" ? "bg-primary text-white" : "bg-gradient-to-br from-lumina-cyan to-lumina-purple text-white"
                      )}>
                        {msg.role === "user" ? <User className="w-6 h-6" /> : <SparklesIcon className="w-6 h-6" />}
                      </div>
                      <div className={cn(
                        "max-w-[85%] rounded-[1.8rem] px-8 py-6 shadow-md relative",
                        msg.role === "user" ? "bg-primary/10 text-foreground rounded-tr-sm" : "bg-muted/30 text-foreground rounded-tl-sm border border-border/30"
                      )}>
                        <div className="prose prose-invert prose-base max-w-none leading-relaxed text-base font-medium tracking-tight opacity-100">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        <div className="text-xs opacity-70 mt-4 flex items-center gap-2 font-medium uppercase tracking-widest">
                           <Clock className="w-3 h-3" />
                           {format(new Date(msg.timestamp), "h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lumina-cyan to-lumina-purple text-white flex items-center justify-center animate-pulse">
                         <SparklesIcon className="w-6 h-6" />
                      </div>
                      <div className="bg-muted/30 rounded-[1.8rem] rounded-tl-sm px-8 py-6 border border-border/30 flex items-center gap-3">
                         <div className="w-2 h-2 bg-lumina-cyan rounded-full animate-bounce [animation-delay:-0.3s]" />
                         <div className="w-2 h-2 bg-lumina-cyan rounded-full animate-bounce [animation-delay:-0.15s]" />
                         <div className="w-2 h-2 bg-lumina-cyan rounded-full animate-bounce" />
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-border/50 bg-background/50 backdrop-blur-2xl sticky bottom-0 z-10">
              <div className="max-w-4xl mx-auto relative group">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask Llama-3 anything..."
                  className="min-h-[64px] max-h-40 resize-none text-base font-medium rounded-2xl border-border/50 bg-background/80 pl-8 pr-16 py-5 scrollbar-hide focus-visible:ring-primary focus-visible:ring-offset-0 transition-all shadow-2xl shadow-primary/5"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  disabled={loading}
                />
                <Button 
                   onClick={() => sendMessage()} 
                   disabled={!input.trim() || loading} 
                   size="icon" 
                   className="absolute right-3.5 bottom-3.5 h-12 w-12 rounded-xl shadow-xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                >
                  {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-4 opacity-70 uppercase tracking-wider font-semibold">Local Intelligence Hub &middot; Private Encryption</p>
            </div>
          </Card>
        </TabsContent>

        {/* ────────── KNOWLEDGE TAB ────────── */}
        <TabsContent value="knowledge" className="flex-1 flex flex-col gap-10 data-[state=active]:animate-slideIn">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-card/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-border/50">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search your deep indexed research..."
                className="pl-16 h-14 bg-background/50 border-border/50 text-base font-medium rounded-2xl transition-all w-full focus-visible:ring-primary shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => { setShowNewNote(true); setAttachments([]); setNoteForm({ title: "", content: "", tags: "" }); }} className="h-14 px-10 rounded-2xl gap-3 font-medium text-lg shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full lg:w-auto">
              <Plus className="w-6 h-6" /> New Discovery
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Notes List (Stacked on Mobile, Side on Desktop) */}
            <div className="lg:w-1/3 xl:w-1/4 space-y-6">
               <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pl-4">Recently Indexed</h3>
               <div className="space-y-4">
                  {notesLoading ? (
                    <div className="flex flex-col items-center py-20 gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : filteredNotes.length === 0 ? (
                    <div className="text-center py-20 bg-card/5 rounded-[2rem] border border-dashed border-border/50">
                       <FileText className="w-12 h-12 mx-auto opacity-10 mb-2" />
                       <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Digital Void</p>
                    </div>
                  ) : (
                    filteredNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => { setSelectedNote(note); setEditingNote(false); setAiResult(""); }}
                        className={cn(
                          "p-6 rounded-[2rem] border-2 transition-all cursor-pointer hover:bg-muted/30 group relative",
                          selectedNote?.id === note.id ? "border-primary bg-primary/5 shadow-2xl shadow-primary/5" : "border-border/30 bg-background/40 hover:border-primary/30"
                        )}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <h4 className="text-lg font-semibold tracking-tight pr-4 text-foreground/90">{note.title}</h4>
                          <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="p-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed font-medium">{note.content || "Empty content"}</p>
                        <div className="flex items-center gap-2 mt-4 flex-wrap">
                          {note.attachments?.length > 0 && <Paperclip className="w-3 h-3 text-lumina-cyan" />}
                          <div className="flex gap-2">
                            {note.tags.slice(0, 2).map(t => <span key={t} className="text-xs bg-secondary/80 border border-border/50 px-3 py-1 rounded-lg font-medium text-muted-foreground uppercase">#{t}</span>)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>

            {/* Note Detail & Reader Mode */}
            <div className="flex-1 min-h-[600px]">
              {selectedNote ? (
                <div className="bg-card/10 backdrop-blur-3xl rounded-[3rem] border-2 border-border/50 p-10 lg:p-16 shadow-2xl space-y-16 animate-fadeIn">
                  {/* Title & Metadata */}
                  <div className="space-y-6 text-center lg:text-left">
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground leading-[1.1]">{selectedNote.title}</h2>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8">
                       <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 px-5 py-2.5 rounded-2xl border border-border/50">
                          <Clock className="w-4 h-4" /> 
                          {formatDate(selectedNote.updatedAt)}
                       </div>
                       {selectedNote.tags.length > 0 && (
                          <div className="flex gap-3">
                            {selectedNote.tags.map(t => <Badge key={t} className="text-xs font-semibold uppercase tracking-widest h-8 px-4 border-primary/20 bg-primary/5 text-primary">{t}</Badge>)}
                          </div>
                       )}
                       <Button variant="outline" size="sm" onClick={() => {
                           setNoteForm({ title: selectedNote.title, content: selectedNote.content, tags: selectedNote.tags.join(", ") });
                           setEditingNote(true);
                           setAttachments([]);
                        }} className="h-10 px-6 gap-3 rounded-2xl border-border/50 font-semibold"><Edit2 className="w-4 h-4" /> Edit Record</Button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="prose prose-invert prose-base max-w-none text-foreground/80 leading-[1.8] font-medium tracking-tight selection:bg-lumina-cyan/30 mt-10">
                    <ReactMarkdown>{selectedNote.content}</ReactMarkdown>
                  </div>

                  {/* Attachments UI */}
                  {selectedNote.attachments?.length > 0 && (
                    <div className="p-10 rounded-[2.5rem] border-2 border-border/50 bg-secondary/5 border-dashed">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-10 flex items-center justify-center lg:justify-start gap-4">
                         <Paperclip className="w-6 h-6 text-lumina-blue" /> Knowledge Sources
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {selectedNote.attachments.map(att => {
                          return (
                            <div key={att.id} className="flex items-center gap-6 p-6 rounded-[2rem] border-2 border-border/30 bg-background/50 hover:bg-background/80 hover:border-primary/50 transition-all group/att">
                              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                 <File className="w-7 h-7 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-lg font-semibold truncate pr-6 text-foreground/90">{att.name}</p>
                                 <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 font-medium">{(att.size / 1024).toFixed(1)} KB Source</p>
                              </div>
                              <button onClick={() => { const l=document.createElement("a"); l.href=att.dataUrl; l.download=att.name; l.click(); }} className="p-3 bg-secondary/50 rounded-xl text-muted-foreground hover:text-foreground hover:scale-110 transition-all"><Download className="w-5 h-5" /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* AI TOOLBAR */}
                  <div className="border-t-2 border-border/50 pt-20 space-y-12">
                    <div className="flex items-center gap-6">
                        <h4 className="flex items-center gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
                          <SparklesIcon className="w-5 h-5 text-lumina-purple" /> Intelligence Scan
                        </h4>
                        <div className="h-0.5 flex-1 bg-gradient-to-r from-border/50 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                      {[
                        { mode: 'summary', label: 'Summarize', desc: 'Core Insight', icon: BookOpen, color: 'text-lumina-purple', bg: 'bg-lumina-purple/10', border: 'border-lumina-purple/30' },
                        { mode: 'revision', label: 'Revise', desc: 'Study Guide', icon: ListChecks, color: 'text-lumina-blue', bg: 'bg-lumina-blue/10', border: 'border-lumina-blue/30' },
                        { mode: 'flowchart', label: 'Map Out', desc: 'Logic Flow', icon: GitBranch, color: 'text-lumina-cyan', bg: 'bg-lumina-cyan/10', border: 'border-lumina-cyan/30' }
                      ].map(tool => (
                        <button
                          key={tool.mode}
                          onClick={() => processWithAI(tool.mode as any)}
                          className={cn(
                            "flex flex-col items-center gap-6 p-10 rounded-[3rem] border-4 transition-all group/tool hover:-translate-y-2 hover:shadow-2xl shadow-primary/10",
                            aiToolMode === tool.mode && !aiProcessing 
                               ? `${tool.bg} ${tool.border} scale-105` 
                               : "bg-background/40 border-border/40 hover:border-primary/50"
                          )}
                        >
                          <div className={cn("w-20 h-20 rounded-[1.5rem] flex items-center justify-center transition-transform group-hover/tool:scale-110 shadow-inner", tool.bg)}>
                             <tool.icon className={cn("w-10 h-10", tool.color)} />
                          </div>
                          <div className="text-center">
                            <span className="text-2xl font-semibold block mb-2">{tool.label}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{tool.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* AI RESULTS AREA */}
                    <div ref={resultRef} className="pt-10">
                        {aiProcessing ? (
                          <div className="flex flex-col items-center justify-center gap-10 py-32 text-center animate-pulse">
                            <div className="relative">
                               <Loader2 className="w-16 h-16 animate-spin text-primary opacity-50" />
                               <SparklesIcon className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-lumina-purple" />
                            </div>
                            <div className="space-y-3">
                               <p className="text-2xl font-semibold tracking-tight text-foreground uppercase">Scanning Neural Network...</p>
                               <p className="text-lg font-medium text-muted-foreground">Running isolated local inference on your data.</p>
                            </div>
                          </div>
                        ) : aiResult && (
                          <div className="animate-slideUp">
                             <div className="rounded-[4rem] border-4 border-primary/20 bg-background/50 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-3xl relative">
                                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-lumina-purple via-lumina-blue to-lumina-cyan" />
                                
                                <div className="px-10 lg:px-16 py-10 border-b-2 border-border/50 flex flex-col lg:flex-row items-center justify-between gap-6 bg-primary/5">
                                   <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
                                      <Badge className="bg-primary/20 text-primary border-primary/40 text-sm px-6 py-2.5 font-semibold uppercase tracking-wider h-auto rounded-2xl">
                                         {aiToolMode} Report
                                      </Badge>
                                      <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                                         <Clock className="w-5 h-5" /> Verified Local Report
                                      </div>
                                   </div>
                                   <Button onClick={() => { navigator.clipboard.writeText(aiResult); toast.success("Copied to clipboard"); }} className="h-14 px-10 rounded-3xl gap-4 font-semibold text-lg uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                      <Copy className="w-6 h-6" /> Copy Result
                                   </Button>
                                </div>

                                <div className="p-10 lg:p-24 max-w-6xl mx-auto">
                                   <div className="prose prose-invert prose-base max-w-none text-foreground leading-[1.8] font-medium tracking-tight markdown-result selection:bg-primary/30">
                                      <ReactMarkdown>{aiResult}</ReactMarkdown>
                                   </div>
                                </div>

                                <div className="p-12 border-t-2 border-border/50 bg-muted/30 text-center">
                                   <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lumina Intelligence Engine &middot; End of Scan</p>
                                </div>
                             </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] text-center p-20 space-y-12 bg-card/5 rounded-[4rem] border-4 border-dashed border-border/30">
                  <div className="relative">
                    <div className="w-40 h-40 rounded-[3rem] bg-secondary/10 flex items-center justify-center shadow-inner">
                      <FileText className="w-20 h-20 opacity-20" />
                    </div>
                    <div className="absolute -inset-10 bg-primary/5 blur-3xl opacity-30" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-2xl font-medium tracking-tight">Second Brain Inactive</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-xl font-medium opacity-80">Select a record from your library to start deep learning and intelligence scans.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* New/Edit Note Dialog */}
      <Dialog open={showNewNote || editingNote} onOpenChange={(o) => { if (!o) { setShowNewNote(false); setEditingNote(false); } }}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-[4rem] border-4 border-border/50 bg-background/95 backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          <div className="p-12 border-b-2 shrink-0 flex flex-col lg:flex-row justify-between items-center gap-8 bg-muted/10">
            <div className="text-center lg:text-left">
               <DialogTitle className="text-3xl font-semibold tracking-tight leading-none">{showNewNote ? "Index Discovery" : "Optimize Record"}</DialogTitle>
               <p className="text-sm text-muted-foreground mt-4 uppercase tracking-wider font-semibold opacity-60">Memory Indexing &middot; Offline Core</p>
            </div>
            <div className="flex gap-4 w-full lg:w-auto">
              <Button variant="ghost" onClick={() => { setShowNewNote(false); setEditingNote(false); }} className="h-14 px-8 rounded-2xl font-semibold text-lg hover:bg-secondary">Cancel</Button>
              <Button onClick={showNewNote ? handleCreateNote : handleUpdateNote} className="h-14 px-12 rounded-2xl font-semibold text-xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex-1 lg:flex-none">{showNewNote ? "Index Now" : "Commit"}</Button>
            </div>
          </div>
          <ScrollArea className="flex-1 p-12">
            <div className="space-y-16 max-w-3xl mx-auto">
              <div className="space-y-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">Subject Header</label>
                <Input placeholder="E.g. Neural Architecture Search" value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} className="text-3xl font-semibold h-24 bg-secondary/10 border-none rounded-[1.5rem] focus-visible:ring-primary px-8 tracking-tight" />
              </div>
              <div className="space-y-6">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-2">Core Content (Markdown)</label>
                <Textarea placeholder="Paste raw data or lecture inputs..." className="min-h-[400px] resize-none leading-relaxed text-lg font-medium bg-secondary/10 border-none rounded-[2rem] p-10 focus-visible:ring-primary shadow-inner" value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="space-y-6">
                <label className="text-xs font-semibold text-lumina-cyan uppercase tracking-wider pl-2">Knowledge Index Tags</label>
                <Input placeholder="exams, research, code..." value={noteForm.tags} onChange={e => setNoteForm(f => ({ ...f, tags: e.target.value }))} className="bg-secondary/10 border-none rounded-2xl h-16 px-8 text-lg font-medium" />
              </div>

              {/* Upload Zone */}
              <div className="space-y-8 pt-10">
                <label className="text-xs font-semibold text-lumina-purple uppercase tracking-wider pl-2">Source Documentation</label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "p-20 rounded-[4rem] border-4 border-dashed flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative overflow-hidden backdrop-blur-md",
                    dragOver ? "border-lumina-purple bg-lumina-purple/10" : "border-border/60 hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <div className="absolute -inset-10 bg-primary/10 blur-[100px] opacity-0 group-hover:opacity-70 transition-opacity" />
                  <Upload className={cn("w-20 h-20 mb-8 transition-transform group-hover:-translate-y-4 duration-500", dragOver ? "text-lumina-purple" : "text-muted-foreground")} />
                  <p className="font-semibold text-3xl text-foreground/90 tracking-tight">Link Raw Intel</p>
                  <p className="text-sm text-muted-foreground/60 mt-4 text-center uppercase tracking-wider font-medium max-w-xs leading-loose">PDF &middot; DOCX &middot; Images <br/> Deep local scan active</p>
                  <input ref={fileInputRef} type="file" className="hidden" multiple accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg" onChange={e => e.target.files && handleFileUpload(e.target.files)} />
                </div>

                {/* Local queue */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center gap-6 p-6 rounded-[2rem] bg-secondary/30 border-2 border-border/50 text-sm group relative overflow-hidden shadow-xl">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                           <Paperclip className="w-6 h-6 text-lumina-blue" />
                        </div>
                        <span className="truncate font-semibold flex-1 text-lg">{att.name}</span>
                        <button onClick={e => { e.stopPropagation(); setAttachments(prev => prev.filter(x => x.id !== att.id)); }} className="text-muted-foreground hover:text-red-400 p-2 bg-background/50 rounded-xl hover:shadow-2xl transition-all"><X className="w-5 h-5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="h-20" />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
