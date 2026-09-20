"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DmPing = {
  kind: "dm";
  key: string;
  href: string;
  msgId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  fromId: string;
  preview: string;
  unread: number;
};

type GroupPing = {
  kind: "group";
  key: string;
  href: string;
  msgId: string;
  subject: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  fromId: string;
  preview: string;
  unread: number;
};

type DmReactPing = {
  kind: "dm-react";
  key: string;
  href: string;
  msgId: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  fromId: string;
  preview: string;
  unread: number;
};

type GroupReactPing = {
  kind: "group-react";
  key: string;
  href: string;
  msgId: string;
  subject: string;
  firstName: string;
  lastName: string;
  photoKey: string;
  fromId: string;
  preview: string;
  unread: number;
};

type Ping = DmPing | GroupPing | DmReactPing | GroupReactPing;
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

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  function clearTimers(key: string) {
    const t = timers.current[key];
    if (!t) return;
    window.clearTimeout(t.fade);
    window.clearTimeout(t.kill);
    delete timers.current[key];
  }

  function dismiss(key: string) {
    clearTimers(key);
    setToasts((list) => list.filter((t) => t.key !== key));
  }

  function arm(key: string) {
    clearTimers(key);
    timers.current[key] = {
      fade: window.setTimeout(() => {
        setToasts((list) => list.map((t) => (t.key === key ? { ...t, fading: true } : t)));
      }, 10000),
      kill: window.setTimeout(() => {
        setToasts((list) => list.filter((t) => t.key !== key));
        delete timers.current[key];
      }, 11000),
    };
  }

  function onOpenPath(href: string) {
    return pathRef.current === href || pathRef.current.startsWith(`${href}?`);
  }

  useEffect(() => {
    setToasts((list) => {
      for (const t of list) {
        if (onOpenPath(t.href)) clearTimers(t.key);
      }
      return list.filter((t) => !onOpenPath(t.href));
    });
  }, [pathname]);

  useEffect(() => {
    let on = true;

    async function tick() {
      try {
        const res = await fetch("/api/inbox", { credentials: "same-origin" });
        if (!res.ok || !on) return;
        const data = (await res.json()) as {
          dms: {
            fromId: string;
            msgId: string;
            firstName: string;
            lastName: string;
            photoKey: string;
            preview: string;
            unread: number;
          }[];
          groups: {
            meetingId: string;
            msgId: string;
            subject: string;
            fromId: string;
            firstName: string;
            lastName: string;
            photoKey: string;
            preview: string;
            unread: number;
          }[];
          dmReacts: {
            noticeId: string;
            actorId: string;
            firstName: string;
            lastName: string;
            photoKey: string;
            preview: string;
            unread: number;
          }[];
          groupReacts: {
            noticeId: string;
            meetingId: string;
            subject: string;
            actorId: string;
            firstName: string;
            lastName: string;
            photoKey: string;
            preview: string;
            unread: number;
          }[];
        };

        const pings: Ping[] = [
          ...data.dms.map(
            (it): DmPing => ({
              kind: "dm",
              key: `dm-${it.fromId}`,
              href: `/friends/${it.fromId}`,
              msgId: it.msgId,
              fromId: it.fromId,
              firstName: it.firstName,
              lastName: it.lastName,
              photoKey: it.photoKey,
              preview: it.preview,
              unread: it.unread,
            }),
          ),
          ...(data.dmReacts || []).map(
            (it): DmReactPing => ({
              kind: "dm-react",
              key: `react-dm-${it.actorId}`,
              href: `/friends/${it.actorId}`,
              msgId: it.noticeId,
              fromId: it.actorId,
              firstName: it.firstName,
              lastName: it.lastName,
              photoKey: it.photoKey,
              preview: it.preview,
              unread: it.unread,
            }),
          ),
          ...data.groups.map(
            (it): GroupPing => ({
              kind: "group",
              key: `group-${it.meetingId}`,
              href: `/meetings/${it.meetingId}`,
              msgId: it.msgId,
              subject: it.subject,
              fromId: it.fromId,
              firstName: it.firstName,
              lastName: it.lastName,
              photoKey: it.photoKey,
              preview: it.preview,
              unread: it.unread,
            }),
          ),
          ...(data.groupReacts || []).map(
            (it): GroupReactPing => ({
              kind: "group-react",
              key: `react-group-${it.meetingId}`,
              href: `/meetings/${it.meetingId}`,
              msgId: it.noticeId,
              subject: it.subject,
              fromId: it.actorId,
              firstName: it.firstName,
              lastName: it.lastName,
              photoKey: it.photoKey,
              preview: it.preview,
              unread: it.unread,
            }),
          ),
        ];

        if (!primed.current) {
          for (const it of pings) latest.current[it.key] = it.msgId;
          primed.current = true;
          return;
        }

        for (const it of pings) {
          if (latest.current[it.key] === it.msgId) continue;
          latest.current[it.key] = it.msgId;
          if (onOpenPath(it.href)) continue;
          setToasts((list) => {
            const rest = list.filter((t) => t.key !== it.key);
            return [...rest, { ...it, fading: false }].slice(-4);
          });
          arm(it.key);
        }
      } catch {}
    }

    tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      on = false;
      window.clearInterval(id);
      for (const key of Object.keys(timers.current)) clearTimers(key);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="msg-toasts">
      {toasts.map((t) => {
        const src = t.photoKey ? `/api/avatars/${t.fromId}?v=${encodeURIComponent(t.photoKey)}` : "";
        return (
          <div key={t.key} className={`msg-toast${t.fading ? " fading" : ""}`}>
            <Link href={t.href} className="msg-toast-main">
              <span className={src ? "avatar avatar-pic" : "avatar"}>
                {src ? <img src={src} alt="" /> : initials(t.firstName, t.lastName)}
              </span>
              <span className="msg-toast-text">
                {t.kind === "group" || t.kind === "group-react" ? (
                  <>
                    <b>{t.subject}</b> · {t.kind === "group-react" ? t.preview : `${t.firstName}: ${t.preview}`}
                  </>
                ) : (
                  <>
                    <b>
                      {t.firstName} {t.lastName}:
                    </b>{" "}
                    {t.preview}
                  </>
                )}
              </span>
              {t.unread > 0 ? <span className="msg-toast-badge">{t.unread > 99 ? "99+" : t.unread}</span> : null}
            </Link>
            <button type="button" className="msg-toast-x" onClick={() => dismiss(t.key)} aria-label="Close">
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
