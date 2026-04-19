"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Sparkles, Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, signup, loading, user, verify, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    verify();
  }, []);

  useEffect(() => {
    if (initialized && user) {
      router.push("/");
    }
  }, [initialized, user, router]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (mode === "signup" && !name.trim()) errs.name = "Name is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email format";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "Min 6 characters";
    if (mode === "signup" && password !== confirmPassword) errs.confirmPassword = "Passwords don't match";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let success = false;
    if (mode === "login") {
      success = await login(email, password);
    } else {
      success = await signup(name, email, password);
    }
    if (success) {
      router.push("/");
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center auth-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-lumina-purple to-lumina-indigo flex items-center justify-center animate-glow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-lumina-purple" />
            <span className="text-muted-foreground text-sm">Loading Lumina...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg px-4">
      {/* Decorative orbs */}
      <div className="fixed top-20 left-20 w-72 h-72 bg-lumina-purple/10 rounded-full blur-[100px] animate-float" />
      <div className="fixed bottom-20 right-20 w-96 h-96 bg-lumina-blue/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: "3s" }} />

      <div className="w-full max-w-md animate-scaleIn">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lumina-purple to-lumina-indigo flex items-center justify-center shadow-lg shadow-lumina-purple/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -inset-2 bg-gradient-to-br from-lumina-purple to-lumina-indigo rounded-2xl opacity-20 blur-lg" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Lumina</h1>
          <p className="text-muted-foreground text-sm mt-1">Student Intelligence Dashboard</p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-[var(--card-shadow-hover)] overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-border/50">
            <button
              onClick={() => { setMode("login"); setErrors({}); }}
              className={`flex-1 py-3.5 text-sm font-medium transition-all duration-200 relative ${
                mode === "login"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              Sign In
              {mode === "login" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-lumina-purple to-lumina-indigo rounded-full" />
              )}
            </button>
            <button
              onClick={() => { setMode("signup"); setErrors({}); }}
              className={`flex-1 py-3.5 text-sm font-medium transition-all duration-200 relative ${
                mode === "signup"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/70"
              }`}
            >
              Sign Up
              {mode === "signup" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-lumina-purple to-lumina-indigo rounded-full" />
              )}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
                  />
                </div>
                {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>

            {mode === "signup" && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/60 bg-background text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-lumina-purple to-lumina-indigo text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200 shadow-lg shadow-lumina-purple/20 hover:shadow-lumina-purple/30 disabled:opacity-50 disabled:cursor-not-allowed mt-6 active:scale-[0.98]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="px-6 pb-6">
            <p className="text-center text-xs text-muted-foreground">
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErrors({}); }}
                className="text-lumina-purple hover:text-lumina-indigo transition-colors font-medium"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-6">
          Secured with local authentication • All data stored offline
        </p>
      </div>
    </div>
  );
}
