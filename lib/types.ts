export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  attachments: NoteAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteAttachment {
  id: string;
  name: string;
  type: string; // 'pdf' | 'image' | 'word' | 'other'
  size: number;
  dataUrl: string; // base64 data URL for offline storage
  textContent?: string; // extracted text for AI processing
}

export interface Subject {
  id: string;
  name: string;
  attended: number;
  total: number;
  color: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  type: "good" | "bad" | "neutral";
  date: string;
}

export type TaskStatus = "todo" | "doing" | "done";

export interface TaskMessage {
  id: string;
  sender: "user" | "other";
  name: string;
  content: string;
  timestamp: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  subjectId?: string;
  discussion?: TaskMessage[];
  createdAt: string;
  attendancePercent?: number;
  safeBunks?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "event" | "task" | "reminder";
  color?: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface FocusSession {
  id: string;
  duration: number;
  type: "focus" | "break";
  completedAt: string;
}

export type AlertSource = "email" | "moodle" | "system";
export type AlertPriority = "low" | "medium" | "high" | "urgent";

export interface Alert {
  id: string;
  title: string;
  message?: string; 
  source: AlertSource;
  priority: AlertPriority;
  read: boolean;
  createdAt: string; 
  link?: string;
  category?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: string;
}

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Books",
  "Stationery",
  "Entertainment",
  "Health",
  "Clothing",
  "Subscription",
  "Other",
];

export const EXPENSE_TYPE_MAP: Record<string, "good" | "bad" | "neutral"> = {
  Books: "good",
  Stationery: "good",
  Health: "good",
  Food: "neutral",
  Transport: "neutral",
  Entertainment: "bad",
  Clothing: "bad",
  Subscription: "neutral",
  Other: "neutral",
};

export const SUBJECT_COLORS = [
  "#a855f7",
  "#3b82f6",
  "#06b6d4",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
];
