import { create } from "zustand";
import { Task, TaskStatus } from "@/lib/types";
import { toast } from "sonner";

interface TasksState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: () => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<void>;
  updateTask: (data: Partial<Task> & { id: string }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, status: TaskStatus) => Promise<void>;
}

export const useTasks = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,

  fetchTasks: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      set({ tasks: data });
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (data) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const task = await res.json();
      set((s) => ({ tasks: [...s.tasks, task] }));
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    }
  },

  updateTask: async (data) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === updated.id ? updated : t)) }));
    } catch {
      toast.error("Failed to update task");
    }
  },

  deleteTask: async (id) => {
    try {
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  },

  moveTask: async (id, status) => {
    const { tasks, updateTask } = get();
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    // Optimistic update
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
    await updateTask({ id, status });
  },
}));
