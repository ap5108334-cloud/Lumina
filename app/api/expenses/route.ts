import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { Expense, EXPENSE_TYPE_MAP } from "@/lib/types";
import { randomUUID } from "crypto";

const FILE = "expenses.json";

export async function GET() {
  const expenses = readJSON<Expense[]>(FILE, []);
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const expenses = readJSON<Expense[]>(FILE, []);
  const expense: Expense = {
    id: randomUUID(),
    title: body.title,
    amount: Number(body.amount),
    category: body.category || "Other",
    type: EXPENSE_TYPE_MAP[body.category] || "neutral",
    date: body.date || new Date().toISOString(),
  };
  expenses.unshift(expense);
  writeJSON(FILE, expenses);
  return NextResponse.json(expense, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const expenses = readJSON<Expense[]>(FILE, []);
  const idx = expenses.findIndex((e) => e.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  expenses[idx] = { ...expenses[idx], ...body };
  writeJSON(FILE, expenses);
  return NextResponse.json(expenses[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const expenses = readJSON<Expense[]>(FILE, []);
  writeJSON(FILE, expenses.filter((e) => e.id !== id));
  return NextResponse.json({ success: true });
}
