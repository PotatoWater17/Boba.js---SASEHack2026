"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  } catch {}
  return "light";
}

export function applyTheme(theme: Theme) {
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  try {
    localStorage.setItem("theme", theme);
    document.cookie = `theme=${theme};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  } catch {}
}

/** Sync localStorage / system preference on first client load (no script tag needed). */
export function ThemeInit() {
  useEffect(() => {
    const onServer = readTheme();
    const stored = readStoredTheme();
    if (stored !== onServer) applyTheme(stored);
    else {
      try {
        localStorage.setItem("theme", stored);
        document.cookie = `theme=${stored};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
      } catch {}
    }
  }, []);

  return null;
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A7.5 7.5 0 0 1 9.5 4 6.5 6.5 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(readTheme() === "dark");
  }, []);

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    applyTheme(next);
    setDark(next === "dark");
  }

  return (
    <button
      type="button"
      className="btn btn-ghost theme-toggle"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
