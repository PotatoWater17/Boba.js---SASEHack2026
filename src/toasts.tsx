"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Ping = {
  fromId: string;
  msgId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  preview: string;
  unread: number;
};

type Toast = Ping & { fading: boolean };

function initials(first: string, last: string) {
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "?";
}

export function MessageToasts() {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const primed = useRef(false);
  const latest = useRef<Record<string, string>>({});
  const timers = useRef<Record<string, { fade: number; kill: number }>>({});
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  function clearTimers(fromId: string) {
    const t = timers.current[fromId];
    if (!t) return;
    window.clearTimeout(t.fade);
    window.clearTimeout(t.kill);
    delete timers.current[fromId];
  }

  function dismiss(fromId: string) {
    clearTimers(fromId);
    setToasts((list) => list.filter((t) => t.fromId !== fromId));
  }

  function arm(fromId: string) {
    clearTimers(fromId);
    timers.current[fromId] = {
      fade: window.setTimeout(() => {
        setToasts((list) => list.map((t) => (t.fromId === fromId ? { ...t, fading: true } : t)));
      }, 10000),
      kill: window.setTimeout(() => {
        setToasts((list) => list.filter((t) => t.fromId !== fromId));
        delete timers.current[fromId];
      }, 11000),
    };
  }

  useEffect(() => {
    setToasts((list) => {
      for (const t of list) {
        if (pathname === `/friends/${t.fromId}`) clearTimers(t.fromId);
      }
      return list.filter((t) => pathname !== `/friends/${t.fromId}`);
    });
  }, [pathname]);

  useEffect(() => {
    let on = true;

    async function tick() {
      try {
        const res = await fetch("/api/inbox", { credentials: "same-origin" });
        if (!res.ok || !on) return;
        const data = (await res.json()) as { items: Ping[] };
        if (!primed.current) {
          for (const it of data.items) latest.current[it.fromId] = it.msgId;
          primed.current = true;
          return;
        }
        for (const it of data.items) {
          if (latest.current[it.fromId] === it.msgId) continue;
          latest.current[it.fromId] = it.msgId;
          if (pathRef.current === `/friends/${it.fromId}`) continue;
          setToasts((list) => {
            const rest = list.filter((t) => t.fromId !== it.fromId);
            return [...rest, { ...it, fading: false }].slice(-4);
          });
          arm(it.fromId);
        }
      } catch {}
    }

    tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      on = false;
      window.clearInterval(id);
      for (const fromId of Object.keys(timers.current)) clearTimers(fromId);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="msg-toasts">
      {toasts.map((t) => {
        const src = t.photoKey ? `/api/avatars/${t.fromId}?v=${encodeURIComponent(t.photoKey)}` : "";
        return (
          <div key={t.fromId} className={`msg-toast${t.fading ? " fading" : ""}`}>
            <Link href={`/friends/${t.fromId}`} className="msg-toast-main">
              <span className={src ? "avatar avatar-pic" : "avatar"}>
                {src ? <img src={src} alt="" /> : initials(t.firstName, t.lastName)}
              </span>
              <span className="msg-toast-text">
                <b>
                  {t.firstName} {t.lastName}:
                </b>{" "}
                {t.preview}
              </span>
              {t.unread > 0 ? <span className="msg-toast-badge">{t.unread > 99 ? "99+" : t.unread}</span> : null}
            </Link>
            <button type="button" className="msg-toast-x" onClick={() => dismiss(t.fromId)} aria-label="Close">
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
