import { create } from "zustand";
import { CalendarEvent } from "@/lib/types";
import { toast } from "sonner";

interface CalendarState {
  events: CalendarEvent[];
  loading: boolean;
  fetchEvents: () => Promise<void>;
  addEvent: (data: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useCalendar = create<CalendarState>((set) => ({
  events: [],
  loading: false,

  fetchEvents: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      set({ events: data });
    } catch {
      toast.error("Failed to load events");
    } finally {
      set({ loading: false });
    }
  },

  addEvent: async (data) => {
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const event = await res.json();
      set((s) => ({ events: [...s.events, event] }));
      toast.success("Event added");
    } catch {
      toast.error("Failed to add event");
    }
  },

  deleteEvent: async (id) => {
    try {
      await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
      set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
      toast.success("Event removed");
    } catch {
      toast.error("Failed to delete event");
    }
  },
}));
