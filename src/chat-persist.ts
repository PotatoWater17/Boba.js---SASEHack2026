"use client";

const PREFIX = "sbb-chat-v2:";
const MAX_EXTRA = 50;

type Stored<T> = { extra: T[]; unsentIds: string[] };

function empty<T>(): Stored<T> {
  return { extra: [], unsentIds: [] };
}

export function loadChatPersist<T>(key: string): Stored<T> {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(PREFIX + key) || sessionStorage.getItem("sbb-chat-v1:" + key);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Stored<T>;
    return {
      extra: Array.isArray(parsed.extra) ? parsed.extra : [],
      unsentIds: Array.isArray(parsed.unsentIds) ? parsed.unsentIds : [],
    };
  } catch {
    return empty();
  }
}

export function saveChatPersist<T extends { id: string; createdAt?: string; pending?: boolean; previewUrl?: string }>(
  key: string,
  extra: T[],
  unsentIds: string[],
) {
  if (typeof window === "undefined") return;
  try {
    const prev = loadChatPersist<T>(key);
    const extraIds = new Set(extra.map((row) => row.id));
    const byId = new Map<string, T>();
    for (const row of prev.extra) {
      if (row.id.startsWith("tmp-") && !extraIds.has(row.id)) continue;
      byId.set(row.id, row);
    }
    for (const row of extra) {
      byId.set(row.id, { ...row, pending: false, previewUrl: "" });
    }
    const merged = [...byId.values()]
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
      .slice(-MAX_EXTRA);
    const ids = [...new Set(unsentIds)];
    localStorage.setItem(PREFIX + key, JSON.stringify({ extra: merged, unsentIds: ids }));
  } catch {
    /* quota / private mode */
  }
}
