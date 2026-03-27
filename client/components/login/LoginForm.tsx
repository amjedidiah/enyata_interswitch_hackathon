"use client";

import { useState, SubmitEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function getLoginErrorMessage(status?: number, apiMessage?: string): string {
  if (status === 401) {
    return "Incorrect email or password. Double-check your details and try again.";
  }
  if (status === 400 || status === 422) {
    if (apiMessage) return apiMessage;
    return "Please enter a valid email address and password.";
  }
  if (status === 429) {
    return "Too many login attempts. Please wait a moment and try again.";
  }
  if (status && status >= 500) {
    return "We couldn’t sign you in right now. Please try again shortly.";
  }

  if (apiMessage) return apiMessage;
  return "Login failed. Please try again.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthContext();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(form);
      setAuth(res.data.token, res.data.user);
      const next = searchParams.get("next") ?? "/dashboard";
      router.push(next);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const status = axiosErr.response?.status;
      const apiMessage = axiosErr.response?.data?.message;
      const message = getLoginErrorMessage(status, apiMessage);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label
          className="text-sm font-medium text-brand-text block mb-1"
          htmlFor="email"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label
          className="text-sm font-medium text-brand-text block mb-1"
          htmlFor="password"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-brand-border rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "hero-cta-primary w-full py-3 rounded-xl font-bold text-brand-primary relative overflow-hidden disabled:opacity-50",
          { "animate-pulse": loading },
        )}
      >
        <span className="relative z-10">
          {loading ? "Signing in…" : "Sign In"}
        </span>
        {!loading && <span className="hero-cta-shine" />}
      </button>
    </form>
  );
}

export default LoginForm;
