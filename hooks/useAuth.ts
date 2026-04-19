import { create } from "zustand";
import { toast } from "sonner";

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verify: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  initialized: false,

  signup: async (name, email, password) => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup", name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Signup failed");
        return false;
      }
      localStorage.setItem("lumina-token", data.token);
      set({ user: data.user, token: data.token });
      toast.success("Account created successfully!");
      return true;
    } catch {
      toast.error("Network error. Please try again.");
      return false;
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return false;
      }
      localStorage.setItem("lumina-token", data.token);
      set({ user: data.user, token: data.token });
      toast.success(`Welcome back, ${data.user.name}!`);
      return true;
    } catch {
      toast.error("Network error. Please try again.");
      return false;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    const { token } = get();
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout", token }),
      });
    } catch {}
    localStorage.removeItem("lumina-token");
    set({ user: null, token: null });
    toast.success("Logged out successfully");
  },

  verify: async () => {
    const token = localStorage.getItem("lumina-token");
    if (!token) {
      set({ initialized: true });
      return;
    }
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token }),
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, token, initialized: true });
      } else {
        localStorage.removeItem("lumina-token");
        set({ initialized: true });
      }
    } catch {
      set({ initialized: true });
    }
  },
}));
