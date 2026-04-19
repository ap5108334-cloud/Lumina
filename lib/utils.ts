import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getAttendanceColor(pct: number): string {
  if (pct >= 85) return "text-green-400";
  if (pct >= 75) return "text-amber-400";
  return "text-red-400";
}

export function getBunkInfo(attended: number, total: number, threshold = 0.75) {
  const pct = total === 0 ? 0 : (attended / total) * 100;
  const minAttend = Math.ceil(threshold * total);
  const safe = attended - minAttend;
  const needed = minAttend - attended;
  return { pct, safe: Math.max(0, safe), needed: Math.max(0, needed) };
}
