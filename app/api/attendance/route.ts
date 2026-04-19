import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { Subject } from "@/lib/types";
import { randomUUID } from "crypto";

const FILE = "attendance.json";

export async function GET() {
  const subjects = readJSON<Subject[]>(FILE, []);
  return NextResponse.json(subjects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const subjects = readJSON<Subject[]>(FILE, []);
  const subject: Subject = {
    id: randomUUID(),
    name: body.name,
    attended: body.attended ?? 0,
    total: body.total ?? 0,
    color: body.color || "#a855f7",
  };
  subjects.push(subject);
  writeJSON(FILE, subjects);
  return NextResponse.json(subject, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const subjects = readJSON<Subject[]>(FILE, []);
  const idx = subjects.findIndex((s) => s.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  subjects[idx] = { ...subjects[idx], ...body };
  writeJSON(FILE, subjects);
  return NextResponse.json(subjects[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const subjects = readJSON<Subject[]>(FILE, []);
  writeJSON(FILE, subjects.filter((s) => s.id !== id));
  return NextResponse.json({ success: true });
}
