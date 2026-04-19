import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { Alert } from "@/lib/types";
import { randomUUID } from "crypto";

const FILE = "alerts.json";

// Seed with sample alerts if empty
function seedAlerts(): Alert[] {
  const now = new Date();
  const alerts: Alert[] = [
    {
      id: randomUUID(),
      title: "Assignment Deadline Approaching",
      message: "Your Data Structures assignment is due in 2 days. Submit on Moodle before the deadline.",
      source: "moodle",
      priority: "high",
      read: false,
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      category: "Assignment",
    },
    {
      id: randomUUID(),
      title: "New Course Material Uploaded",
      message: "Prof. Sharma has uploaded new lecture slides for Machine Learning — Week 8: Neural Networks.",
      source: "moodle",
      priority: "medium",
      read: false,
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      category: "Course Material",
    },
    {
      id: randomUUID(),
      title: "Exam Schedule Published",
      message: "Mid-semester examination schedule has been published. Check your email for the detailed timetable.",
      source: "email",
      priority: "urgent",
      read: false,
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      category: "Examination",
    },
    {
      id: randomUUID(),
      title: "Library Book Return Reminder",
      message: "Your borrowed book 'Introduction to Algorithms' is due for return tomorrow.",
      source: "email",
      priority: "medium",
      read: true,
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      category: "Library",
    },
    {
      id: randomUUID(),
      title: "Quiz Graded",
      message: "Your Operating Systems quiz has been graded. Score: 18/20. Check Moodle for details.",
      source: "moodle",
      priority: "low",
      read: true,
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      category: "Grades",
    },
    {
      id: randomUUID(),
      title: "Workshop Registration Open",
      message: "Registration is now open for the Web Development Workshop this Saturday. Limited seats available.",
      source: "email",
      priority: "medium",
      read: false,
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      category: "Event",
    },
    {
      id: randomUUID(),
      title: "Forum Discussion Due",
      message: "Don't forget to participate in the DBMS forum discussion. Your response is due by Friday.",
      source: "moodle",
      priority: "medium",
      read: false,
      timestamp: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(),
      category: "Discussion",
    },
    {
      id: randomUUID(),
      title: "Attendance Warning",
      message: "Your attendance in Computer Networks is below 75%. Please attend upcoming classes regularly.",
      source: "system",
      priority: "urgent",
      read: false,
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      category: "Attendance",
    },
  ];
  writeJSON(FILE, alerts);
  return alerts;
}

export async function GET() {
  let alerts = readJSON<Alert[]>(FILE, []);
  if (alerts.length === 0) {
    alerts = seedAlerts();
  }
  // Sort by timestamp desc
  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const alerts = readJSON<Alert[]>(FILE, []);
  const alert: Alert = {
    id: randomUUID(),
    title: body.title || "New Alert",
    message: body.message || "",
    source: body.source || "system",
    priority: body.priority || "medium",
    read: false,
    timestamp: new Date().toISOString(),
    link: body.link,
    category: body.category,
  };
  alerts.unshift(alert);
  writeJSON(FILE, alerts);
  return NextResponse.json(alert, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const alerts = readJSON<Alert[]>(FILE, []);

  if (body.markAllRead) {
    alerts.forEach((a) => (a.read = true));
    writeJSON(FILE, alerts);
    return NextResponse.json({ success: true });
  }

  const idx = alerts.findIndex((a) => a.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  alerts[idx] = { ...alerts[idx], ...body };
  writeJSON(FILE, alerts);
  return NextResponse.json(alerts[idx]);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const alerts = readJSON<Alert[]>(FILE, []);
  const filtered = alerts.filter((a) => a.id !== id);
  writeJSON(FILE, filtered);
  return NextResponse.json({ success: true });
}
