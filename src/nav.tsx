"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "About" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/find", label: "Find buddies" },
  { href: "/friends", label: "Friends" },
  { href: "/groups", label: "My groups" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="nav-links">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className={`pill${active ? " active" : ""}`}>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
