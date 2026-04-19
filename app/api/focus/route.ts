import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { FocusSession } from "@/lib/types";
import { randomUUID } from "crypto";

const FILE = "focus.json";

export async function GET() {
  const sessions = readJSON<FocusSession[]>(FILE, []);
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessions = readJSON<FocusSession[]>(FILE, []);
  const session: FocusSession = {
    id: randomUUID(),
    duration: body.duration,
    type: body.type || "focus",
    completedAt: new Date().toISOString(),
  };
  sessions.push(session);
  writeJSON(FILE, sessions);
  return NextResponse.json(session, { status: 201 });
}

export async function DELETE() {
  writeJSON(FILE, []);
  return NextResponse.json({ success: true });
}
