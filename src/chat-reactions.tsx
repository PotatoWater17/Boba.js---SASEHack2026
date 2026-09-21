"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EMOJI_CATEGORIES, REACTION_EMOJIS, type ReactionView } from "@/reactions";

const KEYBOARD_W = 320;
const KEYBOARD_H = 320;

function placeKeyboard(btn: HTMLButtonElement) {
  const r = btn.getBoundingClientRect();
  let left = r.left;
  let top = r.top - KEYBOARD_H - 8;

  if (top < 8) top = r.bottom + 8;
  if (left + KEYBOARD_W > window.innerWidth - 8) left = window.innerWidth - KEYBOARD_W - 8;
  if (left < 8) left = 8;

  return { top, left };
}

export function ChatReactions({
  kind,
  messageId,
  meId,
  initial,
}: {
  kind: "dm" | "group";
  messageId: string;
  meId: string;
  initial: ReactionView[];
}) {
  const [reactions, setReactions] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const kbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReactions(initial);
  }, [initial]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !btnRef.current) return;

    function updatePos() {
      if (btnRef.current) setPos(placeKeyboard(btnRef.current));
    }

    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || kbRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle(emoji: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(kind === "dm" ? "/api/dm-reactions" : "/api/group-reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { reactions: ReactionView[] };
      setReactions(data.reactions);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  function tip(reaction: ReactionView) {
    const names = reaction.users.map((u) => (u.id === meId ? "You" : u.firstName));
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
  }

  const keyboard =
    open && mounted ? (
      <div
        ref={kbRef}
        className="chat-react-keyboard"
        role="menu"
        aria-label="Pick a reaction"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="chat-react-keyboard-head">Pick a reaction</div>
        <div className="chat-react-keyboard-quick">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={`quick-${emoji}`}
              type="button"
              className="chat-react-pick"
              role="menuitem"
              disabled={busy}
              onClick={() => toggle(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="chat-react-keyboard-scroll">
          {EMOJI_CATEGORIES.map((cat) => (
            <section key={cat.label}>
              <div className="chat-react-cat-label">{cat.label}</div>
              <div className="chat-react-grid">
                {cat.emojis.map((emoji) => (
                  <button
                    key={`${cat.label}-${emoji}`}
                    type="button"
                    className="chat-react-pick"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => toggle(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className="chat-reactions">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          className={`chat-react-chip${r.mine ? " mine" : ""}`}
          title={tip(r)}
          disabled={busy}
          onClick={() => toggle(r.emoji)}
        >
          <span>{r.emoji}</span>
          <span className="chat-react-count">{r.count}</span>
        </button>
      ))}
      <div className="chat-react-wrap">
        <button
          ref={btnRef}
          type="button"
          className="chat-react-add"
          aria-label="Add reaction"
          aria-expanded={open}
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
        >
          +
        </button>
      </div>
      {keyboard && mounted ? createPortal(keyboard, document.body) : null}
    </div>
  );
}
