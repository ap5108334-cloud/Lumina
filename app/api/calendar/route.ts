import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { CalendarEvent } from "@/lib/types";
import { randomUUID } from "crypto";

const FILE = "calendar.json";

export async function GET() {
  const events = readJSON<CalendarEvent[]>(FILE, []);
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const events = readJSON<CalendarEvent[]>(FILE, []);
  const event: CalendarEvent = {
    id: randomUUID(),
    title: body.title,
    date: body.date,
    type: body.type || "event",
    color: body.color,
    description: body.description || "",
  };
  events.push(event);
  writeJSON(FILE, events);
  return NextResponse.json(event, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const events = readJSON<CalendarEvent[]>(FILE, []);
  const idx = events.findIndex((e) => e.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  events[idx] = { ...events[idx], ...body };
  writeJSON(FILE, events);
  return NextResponse.json(events[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const events = readJSON<CalendarEvent[]>(FILE, []);
  writeJSON(FILE, events.filter((e) => e.id !== id));
  return NextResponse.json({ success: true });
}
