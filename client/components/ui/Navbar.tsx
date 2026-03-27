"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Coins, ChevronDown, ChevronUp } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";

const SCROLL_THRESHOLD = 200;

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const { hasToken, user, clearAuth } = useAuthContext();

  const handleLogout = useCallback(() => {
    authApi.logout().catch(() => {});
    clearAuth();
    globalThis.location.href = "/login";
  }, [clearAuth]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (
        event.target instanceof Node &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  return (
    <>
      <motion.nav
        animate={{
          backgroundColor: scrolled
            ? "var(--color-brand-primary)"
            : "transparent",
          boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.15)" : "none",
        }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 inset-x-0 z-50 px-6 py-4 flex items-center justify-between"
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-brand-card font-bold text-xl"
        >
          <Coins className="text-brand-accent" size={24} />
          AjoFlow
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-brand-card/80 text-sm font-medium">
          <Link
            href="/pods"
            className="hover:text-brand-card transition-colors"
          >
            Pods
          </Link>
          {hasToken ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 text-xs text-brand-card/80 hover:text-brand-card transition-colors"
              >
                {user && (
                  <>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-card/10 text-brand-card text-xs font-semibold uppercase">
                      {(user.name || user.email || "")
                        .toString()
                        .trim()
                        .charAt(0)}
                    </span>
                    <span className="max-w-40 truncate text-left">
                      {user.name || user.email}
                    </span>
                  </>
                )}
                {userMenuOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-brand-card text-brand-primary shadow-lg py-2 text-sm">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 hover:bg-brand-surface/70 font-semibold"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/my-pods"
                    className="block px-4 py-2 hover:bg-brand-surface/70"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    My Pods
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 hover:bg-brand-surface/70"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-brand-danger hover:bg-brand-surface/70"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="hover:text-brand-card transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-brand-accent text-brand-primary px-4 py-2 rounded-lg hover:bg-brand-accent/90 transition-colors font-semibold"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-brand-card"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </motion.nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-black/30 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 right-0 z-40 w-64 bg-brand-primary flex flex-col pt-20 px-6 gap-6 shadow-2xl md:hidden"
            >
              <Link
                href="/pods"
                className="text-brand-card text-lg"
                onClick={() => setMenuOpen(false)}
              >
                Pods
              </Link>
              {hasToken ? (
                <>
                  {user && (
                    <div className="flex items-center gap-3 text-brand-card/80 text-sm">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-card/10 text-brand-card text-sm font-semibold uppercase">
                        {(user.name || user.email || "")
                          .toString()
                          .trim()
                          .charAt(0)}
                      </span>
                      <span className="truncate">
                        {user.name || user.email}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/dashboard"
                      className="text-brand-card text-lg"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/my-pods"
                      className="text-brand-card text-lg"
                      onClick={() => setMenuOpen(false)}
                    >
                      My Pods
                    </Link>
                    <Link
                      href="/settings"
                      className="text-brand-card text-lg"
                      onClick={() => setMenuOpen(false)}
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="text-brand-danger/80 text-lg text-left"
                    >
                      Log out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-brand-card/80 text-lg"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="bg-brand-accent text-brand-primary px-4 py-2 rounded-lg text-center font-semibold"
                    onClick={() => setMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
