"use client";

import { useState, SubmitEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { authApi } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

function getRegisterErrorMessage(status?: number, apiMessage?: string): string {
  if (status === 409) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (status === 400 || status === 422) {
    if (apiMessage) return apiMessage;
    return "Please check your details and try again.";
  }
  if (status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (status && status >= 500) {
    return "Something went wrong while creating your account. Please try again in a moment.";
  }
  if (apiMessage) return apiMessage;
  return "Registration failed. Please try again.";
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthContext();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();

    if (name.length < 4) {
      toast.error("Please enter your full name.");
      return;
    }

    const phone = form.phone.trim();
    if (!/^\+?\d{7,15}$/.test(phone)) {
      toast.error("Please enter a valid phone number (e.g. +2348100000000).");
      return;
    }

    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const hasMinLength = form.password.length >= 8;
    const hasUppercase = /[A-Z]/.test(form.password);
    const hasSpecial = /[^A-Za-z0-9]/.test(form.password);

    if (!hasMinLength || !hasUppercase || !hasSpecial) {
      toast.error(
        "Password must be at least 8 characters, include one uppercase letter and one special character.",
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match. Please confirm your password.");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        name,
        email,
        phone,
        password: form.password,
      });
      setAuth(res.data.token, res.data.user);
      const next = searchParams.get("next") ?? "/dashboard?welcome=true";
      router.push(next);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      const status = axiosErr.response?.status;
      const apiMessage = axiosErr.response?.data?.message;
      const message = getRegisterErrorMessage(status, apiMessage);
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
          htmlFor="fullName"
        >
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          placeholder="Amara Osei"
        />
      </div>
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
          htmlFor="phone"
        >
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          placeholder="+2348100000000"
        />
        <p className="text-xs text-brand-muted mt-1">
          Used for your wallet and savings pods (e.g. +2348100000000).
        </p>
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
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-brand-border rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            placeholder="8+ chars, 1 uppercase, 1 symbol"
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
      <div>
        <label
          className="text-sm font-medium text-brand-text block mb-1"
          htmlFor="confirmPassword"
        >
          Confirm Password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            required
            minLength={8}
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
            className="w-full border border-brand-border rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            placeholder="Re-enter your password"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="hero-cta-primary w-full py-3 rounded-xl font-bold text-brand-primary relative overflow-hidden disabled:opacity-50"
      >
        <span className="relative z-10">
          {loading ? "Creating account…" : "Create Account"}
        </span>
        {!loading && <span className="hero-cta-shine" />}
      </button>
    </form>
  );
}

export default RegisterForm;
