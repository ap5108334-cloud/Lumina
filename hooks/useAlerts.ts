import { create } from "zustand";
import { Alert } from "@/lib/types";
import { toast } from "sonner";

interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  fetchAlerts: () => Promise<void>;
  createAlert: (data: Partial<Alert>) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
}

export const useAlerts = create<AlertsState>((set) => ({
  alerts: [],
  loading: false,

  fetchAlerts: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      set({ alerts: data });
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      set({ loading: false });
    }
  },

  createAlert: async (data) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const alert = await res.json();
      set((s) => ({ alerts: [alert, ...s.alerts] }));
    } catch {
      toast.error("Failed to create alert");
    }
  },

  markRead: async (id) => {
    try {
      await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
      set((s) => ({
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
      }));
    } catch {
      toast.error("Failed to update alert");
    }
  },

  markAllRead: async () => {
    try {
      await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      set((s) => ({
        alerts: s.alerts.map((a) => ({ ...a, read: true })),
      }));
      toast.success("All alerts marked as read");
    } catch {
      toast.error("Failed to update alerts");
    }
  },

  deleteAlert: async (id) => {
    try {
      await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
      set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) }));
    } catch {
      toast.error("Failed to delete alert");
    }
  },
}));
