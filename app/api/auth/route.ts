import { NextRequest, NextResponse } from "next/server";
import { readJSON, writeJSON } from "@/lib/storage";
import { User, AuthSession } from "@/lib/types";
import { randomUUID, createHash } from "crypto";

const USERS_FILE = "users.json";
const SESSIONS_FILE = "sessions.json";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "lumina-salt-2024").digest("hex");
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, name, email, password } = body;

  if (action === "signup") {
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const users = readJSON<User[]>(USERS_FILE, []);
    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const user: User = {
      id: randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    writeJSON(USERS_FILE, users);

    // Create session
    const session: AuthSession = {
      userId: user.id,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const sessions = readJSON<AuthSession[]>(SESSIONS_FILE, []);
    sessions.push(session);
    writeJSON(SESSIONS_FILE, sessions);

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email }, token: session.token },
      { status: 201 }
    );
  }

  if (action === "login") {
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const users = readJSON<User[]>(USERS_FILE, []);
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === hashPassword(password)
    );

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create session
    const session: AuthSession = {
      userId: user.id,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const sessions = readJSON<AuthSession[]>(SESSIONS_FILE, []);
    // Clean old sessions for this user
    const filtered = sessions.filter((s) => s.userId !== user.id);
    filtered.push(session);
    writeJSON(SESSIONS_FILE, filtered);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
      token: session.token,
    });
  }

  if (action === "verify") {
    const { token } = body;
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const sessions = readJSON<AuthSession[]>(SESSIONS_FILE, []);
    const session = sessions.find((s) => s.token === token && new Date(s.expiresAt) > new Date());

    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const users = readJSON<User[]>(USERS_FILE, []);
    const user = users.find((u) => u.id === session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  }

  if (action === "logout") {
    const { token } = body;
    const sessions = readJSON<AuthSession[]>(SESSIONS_FILE, []);
    const filtered = sessions.filter((s) => s.token !== token);
    writeJSON(SESSIONS_FILE, filtered);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
