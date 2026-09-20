"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "About StudyBuddyBoard", shortLabel: "About" },
  { href: "/dashboard", label: "Buddy Board", shortLabel: "Board" },
  { href: "/find", label: "Find Buddies", shortLabel: "Find" },
  { href: "/friends", label: "My Buddies", shortLabel: "Buddies" },
  { href: "/groups", label: "My Study Buddy Groups", shortLabel: "Groups" },
];

export function NavLinks({
  friendNotices = 0,
  groupNotices = 0,
  isAdmin = false,
}: {
  friendNotices?: number;
  groupNotices?: number;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [friends, setFriends] = useState(friendNotices);
  const [groups, setGroups] = useState(groupNotices);

  useEffect(() => {
    setFriends(friendNotices);
    setGroups(groupNotices);
  }, [friendNotices, groupNotices]);

  useEffect(() => {
    let on = true;

    async function tick() {
      try {
        const res = await fetch("/api/inbox", { credentials: "same-origin" });
        if (!res.ok || !on) return;
        const data = (await res.json()) as { friendNotices: number; groupNotices: number };
        setFriends(data.friendNotices);
        setGroups(data.groupNotices);
      } catch {}
    }

    tick();
    const id = window.setInterval(tick, 2500);
    return () => {
      on = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="nav-links">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const note = link.href === "/friends" ? friends : link.href === "/groups" ? groups : 0;
        return (
          <Link key={link.href} href={link.href} className={`pill${active ? " active" : ""}`}>
            <span className="nav-label-full">{link.label}</span>
            <span className="nav-label-short">{link.shortLabel}</span>
            {note > 0 ? <span className="nav-note">{note > 9 ? "9+" : note}</span> : null}
          </Link>
        );
      })}
      {isAdmin ? (
        <Link href="/admin" className={`pill${pathname.startsWith("/admin") ? " active" : ""}`}>
          <span className="nav-label-full">Admin Buddies</span>
          <span className="nav-label-short">Admin</span>
        </Link>
      ) : null}
    </div>
  );
}
