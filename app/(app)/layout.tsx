"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useTheme, initializeTheme } from "@/hooks/useTheme";
import { useSidebar } from "@/hooks/useSidebar";
import { useAlerts } from "@/hooks/useAlerts";
import Sidebar from "@/components/Sidebar";
import { 
  Loader2, Sparkles, Search, Bell, ChevronDown, 
  LayoutDashboard, Brain, BarChart, Wallet, Users, 
  Timer, Calendar, LogOut, Settings, Check, Mail, AlertTriangle, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

const ROUTES = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "AI Assistant", path: "/ai", icon: Brain },
  { name: "Attendance", path: "/attendance", icon: BarChart },
  { name: "Expenses", path: "/expenses", icon: Wallet },
  { name: "Collab Hub", path: "/collaboration", icon: Users },
  { name: "Focus Timer", path: "/focus", icon: Timer },
  { name: "Calendar", path: "/calendar", icon: Calendar },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, verify, logout } = useAuth();
  const { setTheme } = useTheme();
  const { isOpen } = useSidebar();
  const { alerts, fetchAlerts, markRead, markAllRead } = useAlerts();
  const router = useRouter();
  
  const [ready, setReady] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Close dropdowns when clicking outside
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const theme = initializeTheme();
    setTheme(theme as "light" | "dark");
    verify().then(() => setReady(true));
    
    // Command+K Shortcut for Search
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    
    // Click outside listener
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (ready && !user) router.push("/auth");
  }, [ready, user, router]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;
  const filteredRoutes = ROUTES.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSearchNavigate = (path: string) => {
    router.push(path);
    setSearchQuery("");
    setSearchFocused(false);
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleLogout = () => {
    logout();
    router.push("/auth");
  };

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lumina-purple to-lumina-indigo flex items-center justify-center animate-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-lumina-purple" />
            <span className="text-muted-foreground text-sm font-medium">Loading your dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-300 min-h-screen ${isOpen ? 'ml-64' : 'ml-[72px]'}`}>
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 border-b border-border/40 bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 lg:px-8">
          
          {/* Search Engine */}
          <div className="flex flex-1 max-w-md relative" ref={searchRef}>
            <div className={`flex items-center gap-2.5 w-full px-4 py-2 rounded-xl border transition-all duration-200 ${searchFocused ? 'border-primary/40 bg-background shadow-sm ring-2 ring-primary/10' : 'border-border/50 bg-secondary/30'}`}>
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                id="global-search"
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground/50 font-medium"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  setTimeout(() => setSearchFocused(false), 200); // delay to allow clicks
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredRoutes.length > 0) {
                    handleSearchNavigate(filteredRoutes[0].path);
                  }
                }}
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/50 bg-secondary/80 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </div>
            
            {/* Search Results Dropdown */}
            {searchFocused && searchQuery && (
              <div className="absolute top-12 left-0 w-full bg-card border border-border/50 rounded-xl shadow-lg p-2 animate-slideUp z-50">
                {filteredRoutes.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-1">Pages</p>
                    {filteredRoutes.map((route, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearchNavigate(route.path)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/80 text-left transition-colors group"
                      >
                        <route.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium">{route.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No matches found for "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            
            {/* Notifications Engine */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifs(!showNotifs)}
                className={`relative p-2.5 rounded-xl transition-all duration-200 group ${showNotifs ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
              >
                <Bell className="w-[18px] h-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-card" />
                )}
              </button>

              {showNotifs && (
                <div className="absolute top-12 right-0 w-80 bg-card border border-border/50 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 animate-slideDown z-50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllRead()} className="text-[10px] text-primary hover:underline font-medium">Mark all read</button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {alerts.length > 0 ? alerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        onClick={() => !alert.read && markRead(alert.id)}
                        className={`p-3 rounded-xl border flex gap-3 cursor-pointer transition-all ${alert.read ? 'bg-background/50 border-border/30 opacity-70' : 'bg-background border-border shadow-sm hover:border-primary/50'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          alert.source === 'email' ? 'bg-blue-500/10 text-blue-500' : 
                          alert.source === 'moodle' ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'
                        }`}>
                          {alert.source === 'email' ? <Mail className="w-4 h-4" /> : 
                           alert.source === 'moodle' ? <AlertTriangle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`text-sm ${alert.read ? 'text-muted-foreground' : 'text-foreground font-semibold'}`}>{alert.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{alert.content || "No detailed content."}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase">
                            {alert.createdAt && !isNaN(new Date(alert.createdAt).getTime()) 
                              ? formatDistanceToNow(new Date(alert.createdAt)) + " ago" 
                              : "Recently"}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">You're all caught up!</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfile(!showProfile)}
                className={`flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl transition-all duration-200 group ${showProfile ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lumina-purple to-lumina-indigo flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {user?.name?.charAt(0).toUpperCase() || "S"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold leading-tight">{user?.name?.split(" ")[0] || "Student"}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight font-medium uppercase tracking-wider">{user?.email?.split("@")[0] || "Active"}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
              </button>

              {showProfile && (
                <div className="absolute top-12 right-0 w-48 bg-card border border-border/50 rounded-xl shadow-lg p-1.5 animate-slideDown z-50">
                  <div className="px-3 py-2 border-b border-border/40 mb-1">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors">
                    <Settings className="w-4 h-4" />
                    Account Settings
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
            
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 overflow-x-hidden">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
