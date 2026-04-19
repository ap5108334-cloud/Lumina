import { create } from "zustand";
import { Subject } from "@/lib/types";
import { toast } from "sonner";

interface AttendanceState {
  subjects: Subject[];
  loading: boolean;
  fetchSubjects: () => Promise<void>;
  addSubject: (data: Partial<Subject>) => Promise<void>;
  updateSubject: (data: Partial<Subject> & { id: string }) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  markAttendance: (id: string, attended: boolean) => Promise<void>;
}

export const useAttendance = create<AttendanceState>((set, get) => ({
  subjects: [],
  loading: false,

  fetchSubjects: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/attendance");
      const data = await res.json();
      set({ subjects: data });
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      set({ loading: false });
    }
  },

  addSubject: async (data) => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const subject = await res.json();
      set((s) => ({ subjects: [...s.subjects, subject] }));
      toast.success("Subject added");
    } catch {
      toast.error("Failed to add subject");
    }
  },

  updateSubject: async (data) => {
    try {
      const res = await fetch("/api/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      set((s) => ({ subjects: s.subjects.map((s) => (s.id === updated.id ? updated : s)) }));
    } catch {
      toast.error("Failed to update subject");
    }
  },

  deleteSubject: async (id) => {
    try {
      await fetch(`/api/attendance?id=${id}`, { method: "DELETE" });
      set((s) => ({ subjects: s.subjects.filter((s) => s.id !== id) }));
      toast.success("Subject deleted");
    } catch {
      toast.error("Failed to delete subject");
    }
  },

  markAttendance: async (id, attended) => {
    const { subjects, updateSubject } = get();
    const subject = subjects.find((s) => s.id === id);
    if (!subject) return;
    await updateSubject({
      id,
      attended: subject.attended + (attended ? 1 : 0),
      total: subject.total + 1,
    });
    toast.success(attended ? "Marked present ✓" : "Marked absent ✗");
  },
}));
