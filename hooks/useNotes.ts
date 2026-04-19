import { create } from "zustand";
import { Note, NoteAttachment } from "@/lib/types";
import { toast } from "sonner";

interface NotesState {
  notes: Note[];
  loading: boolean;
  fetchNotes: () => Promise<void>;
  createNote: (data: Partial<Note>) => Promise<Note | null>;
  updateNote: (data: Partial<Note> & { id: string }) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,

  fetchNotes: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/notes");
      const data = await res.json();
      // Ensure all notes have attachments array
      const normalized = data.map((n: any) => ({
        ...n,
        attachments: n.attachments || [],
      }));
      set({ notes: normalized });
    } catch {
      toast.error("Failed to load notes");
    } finally {
      set({ loading: false });
    }
  },

  createNote: async (data) => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const note = await res.json();
      set((s) => ({ notes: [note, ...s.notes] }));
      toast.success("Note created");
      return note;
    } catch {
      toast.error("Failed to create note");
      return null;
    }
  },

  updateNote: async (data) => {
    try {
      const res = await fetch("/api/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      set((s) => ({ notes: s.notes.map((n) => (n.id === updated.id ? { ...updated, attachments: updated.attachments || [] } : n)) }));
      toast.success("Note saved");
    } catch {
      toast.error("Failed to update note");
    }
  },

  deleteNote: async (id) => {
    try {
      await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      set((s) => ({ notes: s.notes.filter((n) => n.id !== id) }));
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    }
  },
}));
