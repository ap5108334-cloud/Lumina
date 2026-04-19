import { create } from "zustand";
import { Expense } from "@/lib/types";
import { toast } from "sonner";

interface ExpensesState {
  expenses: Expense[];
  loading: boolean;
  fetchExpenses: () => Promise<void>;
  addExpense: (data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpenses = create<ExpensesState>((set) => ({
  expenses: [],
  loading: false,

  fetchExpenses: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/expenses");
      const data = await res.json();
      set({ expenses: data });
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      set({ loading: false });
    }
  },

  addExpense: async (data) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const expense = await res.json();
      set((s) => ({ expenses: [expense, ...s.expenses] }));
      toast.success("Expense logged");
    } catch {
      toast.error("Failed to add expense");
    }
  },

  deleteExpense: async (id) => {
    try {
      await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
      toast.success("Expense removed");
    } catch {
      toast.error("Failed to delete expense");
    }
  },
}));
