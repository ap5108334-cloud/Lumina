import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { Note } from "@/lib/types";
import { randomUUID } from "crypto";

const FILE = "notes.json";

export async function GET() {
  const notes = readJSON<Note[]>(FILE, []);
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const notes = readJSON<Note[]>(FILE, []);
  const now = new Date().toISOString();
  const note: Note = {
    id: randomUUID(),
    title: body.title || "Untitled",
    content: body.content || "",
    tags: body.tags || [],
    attachments: body.attachments || [],
    createdAt: now,
    updatedAt: now,
  };
  notes.unshift(note);
  writeJSON(FILE, notes);
  return NextResponse.json(note, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const notes = readJSON<Note[]>(FILE, []);
  const idx = notes.findIndex((n) => n.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  notes[idx] = { ...notes[idx], ...body, updatedAt: new Date().toISOString() };
  writeJSON(FILE, notes);
  return NextResponse.json(notes[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const notes = readJSON<Note[]>(FILE, []);
  const filtered = notes.filter((n) => n.id !== id);
  writeJSON(FILE, filtered);
  return NextResponse.json({ success: true });
}
