"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useInboxLive } from "@/inbox-live";
import { visibleFriendNotices, visibleGroupNotices } from "@/inbox-ack";

const LINKS = [
  { href: "/", label: "About StudyBuddyBoard", shortLabel: "About" },
  { href: "/dashboard", label: "Buddy Board", shortLabel: "Board" },
  { href: "/find", label: "Find Buddies", shortLabel: "Find" },
  { href: "/friends", label: "My Buddies", shortLabel: "Buddies" },
  { href: "/groups", label: "My Study Buddy Groups", shortLabel: "Groups" },
];

function openFriendId(pathname: string) {
  const match = pathname.match(/^\/friends\/([^/?#]+)/);
  return match?.[1];
}

function openMeetingId(pathname: string) {
  const match = pathname.match(/^\/meetings\/([^/?#]+)/);
  return match?.[1];
}

export function NavLinks({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const { inbox } = useInboxLive();
  const friends = visibleFriendNotices(inbox.dms, openFriendId(pathname));
  const groups = visibleGroupNotices(inbox.groups, openMeetingId(pathname));

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
