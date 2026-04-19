import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { Task, Subject } from "@/lib/types";
import { randomUUID } from "crypto";

const FILE = "tasks.json";

export async function GET() {
  const tasks = readJSON<Task[]>(FILE, []);
  const subjects = readJSON<Subject[]>("attendance.json", []);

  const enrichedTasks = tasks.map((task) => {
    if (!task.subjectId) return task;
    const subject = subjects.find((s) => s.id === task.subjectId);
    if (!subject) return task;

    let attendancePercent = 0;
    let safeBunks = 0;

    if (subject.total > 0) {
      attendancePercent = Math.round((subject.attended / subject.total) * 100);
      safeBunks = subject.attended - Math.ceil(0.75 * subject.total);
    }

    return {
      ...task,
      attendancePercent,
      safeBunks,
    };
  });

  return NextResponse.json(enrichedTasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tasks = readJSON<Task[]>(FILE, []);
  const task: Task = {
    id: randomUUID(),
    title: body.title,
    description: body.description || "",
    status: body.status || "todo",
    priority: body.priority || "medium",
    dueDate: body.dueDate,
    subjectId: body.subjectId,
    discussion: body.discussion || [],
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  writeJSON(FILE, tasks);
  return NextResponse.json(task, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const tasks = readJSON<Task[]>(FILE, []);
  const idx = tasks.findIndex((t) => t.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  tasks[idx] = { ...tasks[idx], ...body };
  writeJSON(FILE, tasks);
  return NextResponse.json(tasks[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const tasks = readJSON<Task[]>(FILE, []);
  writeJSON(FILE, tasks.filter((t) => t.id !== id));
  return NextResponse.json({ success: true });
}
