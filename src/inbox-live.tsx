"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { emptyInbox, type InboxPayload } from "@/inbox-types";

type InboxLiveValue = {
  inbox: InboxPayload;
  refreshInbox: () => Promise<void>;
};

const InboxLiveContext = createContext<InboxLiveValue | null>(null);

export function InboxLive({
  initial,
  enabled,
  children,
}: {
  initial: InboxPayload;
  enabled: boolean;
  children: ReactNode;
}) {
  const [inbox, setInbox] = useState(initial);
  const polled = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (polled.current) return;
    setInbox(initial);
  }, [initial]);

  const refreshInbox = useCallback(async () => {
    if (!enabledRef.current) return;
    try {
      const res = await fetch("/api/inbox", { credentials: "same-origin", cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as InboxPayload;
      polled.current = true;
      setInbox({
        ...emptyInbox(),
        ...data,
        buddyRequests: Array.isArray(data.buddyRequests) ? data.buddyRequests : [],
        meetupInvites: Array.isArray(data.meetupInvites) ? data.meetupInvites : [],
        joinRequests: Array.isArray(data.joinRequests) ? data.joinRequests : [],
        groupActivity: Array.isArray(data.groupActivity) ? data.groupActivity : [],
        dms: Array.isArray(data.dms) ? data.dms : [],
        groups: Array.isArray(data.groups) ? data.groups : [],
      });
    } catch {
      /* inbox poll is best-effort */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refreshInbox();
    const id = window.setInterval(() => void refreshInbox(), 2500);
    return () => window.clearInterval(id);
  }, [enabled, refreshInbox]);

  return <InboxLiveContext.Provider value={{ inbox, refreshInbox }}>{children}</InboxLiveContext.Provider>;
}

export function useInboxLive() {
  const ctx = useContext(InboxLiveContext);
  if (!ctx) throw new Error("useInboxLive needs InboxLive");
  return ctx;
}
