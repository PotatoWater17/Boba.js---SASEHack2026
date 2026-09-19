"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "About" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/find", label: "Find buddies" },
  { href: "/friends", label: "Buddies" },
  { href: "/groups", label: "My groups" },
];

export function NavLinks({
  friendNotices = 0,
  groupNotices = 0,
}: {
  friendNotices?: number;
  groupNotices?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="nav-links">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        const note =
          link.href === "/friends" ? friendNotices : link.href === "/groups" ? groupNotices : 0;
        return (
          <Link key={link.href} href={link.href} className={`pill${active ? " active" : ""}`}>
            {link.label}
            {note > 0 ? <span className="nav-note">{note > 9 ? "9+" : note}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
