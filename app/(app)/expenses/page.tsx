"use client";

import { useEffect, useState, useMemo } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { EXPENSE_CATEGORIES } from "@/lib/types";
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
import { formatCurrency, cn } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { toast } from "sonner";

const COLORS: Record<string, string> = {
  Food: "#f59e0b",
  Transport: "#3b82f6",
  Books: "#22c55e",
  Stationery: "#06b6d4",
  Entertainment: "#ec4899",
  Health: "#10b981",
  Clothing: "#8b5cf6",
  Subscription: "#f97316",
  Other: "#6b7280",
};

export default function ExpensesPage() {
  const { expenses, loading, fetchExpenses, addExpense, deleteExpense } = useExpenses();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", category: "Food" });

  useEffect(() => { fetchExpenses(); }, []);

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error("Description required"); return; }
    if (!form.amount || isNaN(Number(form.amount))) { toast.error("Valid amount required"); return; }
    await addExpense({ title: form.title, amount: Number(form.amount), category: form.category });
    setForm({ title: "", amount: "", category: "Food" });
    setShowAdd(false);
  };

  const weeklyExpenses = useMemo(() => {
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());
    return expenses.filter((e) =>
      isWithinInterval(new Date(e.date), { start, end })
    );
  }, [expenses]);

  const weeklyTotal = weeklyExpenses.reduce((a, e) => a + e.amount, 0);
  const totalAll = expenses.reduce((a, e) => a + e.amount, 0);

  const goodSpend = expenses
    .filter((e) => e.type === "good")
    .reduce((a, e) => a + e.amount, 0);
  const badSpend = expenses
    .filter((e) => e.type === "bad")
    .reduce((a, e) => a + e.amount, 0);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const typeIcon = (type: string) => {
    if (type === "good") return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (type === "bad") return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-lumina-amber" />
            Expense Tracker
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track where your money goes</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "This Week", value: formatCurrency(weeklyTotal), color: "text-lumina-amber", bg: "bg-amber-500/10" },
          { label: "Total Spent", value: formatCurrency(totalAll), color: "text-foreground", bg: "bg-secondary/30" },
          { label: "Good Spend", value: formatCurrency(goodSpend), color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Bad Spend", value: formatCurrency(badSpend), color: "text-red-400", bg: "bg-red-500/10" },
        ].map(({ label, value, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={cn("text-2xl font-bold mb-1", color)}>{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name] || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: "11px", color: "#9ca3af" }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Wallet className="w-8 h-8 mx-auto mb-2 opacity-20" />
                No expenses logged
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {expenses.slice(0, 20).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/30 group transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[e.category] || "#6b7280" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">{e.category}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(e.date), "MMM d")}
                        </span>
                        {typeIcon(e.type)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{formatCurrency(e.amount)}</span>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary */}
      {weeklyExpenses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">This Week's Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["good", "neutral", "bad"] as const).map((type) => {
                const total = weeklyExpenses
                  .filter((e) => e.type === type)
                  .reduce((a, e) => a + e.amount, 0);
                const bg = type === "good" ? "bg-green-500/10" : type === "bad" ? "bg-red-500/10" : "bg-blue-500/10";
                const color = type === "good" ? "text-green-500" : type === "bad" ? "text-red-500" : "text-blue-500";
                const label = type === "good" ? "Essential (Good)" : type === "bad" ? "Discretionary (Bad)" : "Neutral";
                return (
                  <div key={type} className={cn("p-4 rounded-xl text-center", bg)}>
                    <div className={cn("text-xl font-bold mb-1", color)}>{formatCurrency(total)}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Description (e.g. Lunch at canteen)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Amount (₹)"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Log Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
