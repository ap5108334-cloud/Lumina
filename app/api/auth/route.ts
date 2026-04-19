import { NextRequest, NextResponse } from "next/server";
import { User, AuthSession } from "@/lib/types";
import { randomUUID, createHash } from "crypto";

// ✅ In-memory storage (works on Vercel for demo)
let users: User[] = [];
let sessions: AuthSession[] = [];

function hashPassword(password: string): string {
  return createHash("sha256")
    .update(password + "lumina-salt-2024")
    .digest("hex");
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, name, email, password, token } = body;

  // ================= SIGNUP =================
  if (action === "signup") {
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password too short" }, { status: 400 });
    }

    if (users.find((u) => u.email === email)) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const user: User = {
      id: randomUUID(),
      name,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    users.push(user);

    const session: AuthSession = {
      userId: user.id,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    sessions.push(session);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      token: session.token,
    });
  }

  // ================= LOGIN =================
  if (action === "login") {
    const user = users.find(
      (u) =>
        u.email === email &&
        u.passwordHash === hashPassword(password)
    );

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session: AuthSession = {
      userId: user.id,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    sessions = sessions.filter((s) => s.userId !== user.id);
    sessions.push(session);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      token: session.token,
    });
  }

  // ================= VERIFY =================
  if (action === "verify") {
    const session = sessions.find(
      (s) => s.token === token && new Date(s.expiresAt) > new Date()
    );

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = users.find((u) => u.id === session.userId);

    return NextResponse.json({
      user: { id: user?.id, name: user?.name, email: user?.email },
    });
  }

  // ================= LOGOUT =================
  if (action === "logout") {
    sessions = sessions.filter((s) => s.token !== token);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}