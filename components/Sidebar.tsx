"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Brain, FileText, BarChart2, Wallet,
  Timer, Calendar, CheckSquare, Sparkles, Bell, Sun, Moon, LogOut, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useAlerts } from "@/hooks/useAlerts";
import { useSidebar } from "@/hooks/useSidebar";
import { useEffect, useState } from "react";
import { Battery, BatteryWarning, ChevronLeft, ChevronRight } from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, color: "text-lumina-purple" },
  { href: "/ai", label: "AI Assistant", icon: Brain, color: "text-lumina-indigo" },
  { href: "/attendance", label: "Attendance", icon: BarChart2, color: "text-lumina-green" },
  { href: "/expenses", label: "Expenses", icon: Wallet, color: "text-lumina-amber" },
  { href: "/collaboration", label: "Collab Hub", icon: Users, color: "text-lumina-indigo" },
  { href: "/focus", label: "Focus Timer", icon: Timer, color: "text-lumina-pink" },
  { href: "/calendar", label: "Calendar", icon: Calendar, color: "text-lumina-blue" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { alerts, fetchAlerts } = useAlerts();
  const { isOpen, toggle } = useSidebar();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const [batteryMode, setBatteryMode] = useState({ level: 100, charging: true });
  useEffect(() => {
    let battery: any;
    const updateBattery = () => {
      setBatteryMode({ level: Math.round(battery.level * 100), charging: battery.charging });
    };
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((b: any) => {
        battery = b;
        updateBattery();
        b.addEventListener("levelchange", updateBattery);
        b.addEventListener("chargingchange", updateBattery);
      });
    }
    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", updateBattery);
        battery.removeEventListener("chargingchange", updateBattery);
      }
    };
  }, []);

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full flex flex-col bg-card border-r border-border/50 z-40 transition-all duration-300",
      isOpen ? "w-64" : "w-[72px]"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center px-5 py-5 border-b border-border/40 relative transition-all", isOpen ? "gap-3" : "justify-center px-0")}>
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lumina-purple to-lumina-indigo flex items-center justify-center shadow-lg shadow-lumina-purple/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>
        {isOpen && (
          <div className="overflow-hidden whitespace-nowrap border-none">
            <h1 className="text-base font-bold gradient-text">Lumina</h1>
            <p className="text-[10px] text-muted-foreground font-medium">Student Intelligence</p>
          </div>
        )}
        
        {/* Toggle Button */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-7 flex items-center justify-center w-6 h-6 rounded-full bg-card border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all z-50 shadow-md hover:shadow-lg"
        >
          {isOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isOpen ? "px-3 mx-0" : "justify-center px-0 mx-1",
                active
                  ? "bg-primary/10 text-foreground border border-primary/15"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-[18px] h-[18px] shrink-0 transition-all duration-200",
                  active ? color : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">{label}</span>}
              {isOpen && active && (
                <div className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
              {/* Alert badge on Dashboard */}
              {href === "/" && unreadCount > 0 && !active && (
                <span className={cn(
                  "font-bold bg-red-500 text-white rounded-full flex items-center justify-center shrink-0",
                  isOpen ? "ml-auto text-[9px] w-4 h-4" : "absolute right-0 top-0 text-[8px] w-3 h-3 translate-x-1 -translate-y-1"
                )}>
                  {isOpen ? (unreadCount > 9 ? "9+" : unreadCount) : ""}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Battery Guardian */}
      {!batteryMode.charging && batteryMode.level < 15 && (
        <div className={cn(
          "mx-3 my-2 rounded-xl border border-red-500/30 bg-red-500/10 flex transition-all duration-300 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse",
          isOpen ? "p-2.5 items-start gap-2" : "p-2 items-center justify-center mx-2"
        )}>
          <BatteryWarning className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          {isOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <p className="text-[11px] font-bold text-red-400">Battery Saver Active</p>
              <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">Automated AI background tracking is paused.</p>
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className={cn("py-3 border-t border-border/40 space-y-1.5 relative transition-all duration-300", isOpen ? "px-3" : "px-2")}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          className={cn(
            "flex items-center w-full py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200",
            isOpen ? "gap-3 px-3" : "justify-center px-0"
          )}
        >
          {theme === "dark" ? (
            <Sun className="w-[18px] h-[18px] text-lumina-amber shrink-0" />
          ) : (
            <Moon className="w-[18px] h-[18px] text-lumina-indigo shrink-0" />
          )}
          {isOpen && <span className="font-medium whitespace-nowrap text-ellipsis overflow-hidden">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {/* User profile + logout */}
        <div className={cn("flex items-center py-2.5 transition-all duration-300", isOpen ? "gap-2.5 px-3" : "flex-col gap-2 justify-center px-0")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lumina-purple/40 to-lumina-indigo/40 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
            {user?.name?.charAt(0).toUpperCase() || "S"}
          </div>
          
          {isOpen && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-medium text-foreground truncate">{user?.name || "Student"}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email || "local"}</p>
            </div>
          )}
          
          <button
            onClick={logout}
            className={cn("rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200", isOpen ? "p-1.5" : "p-2 w-full flex justify-center")}
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  );
}
