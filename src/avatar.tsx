import type { CSSProperties } from "react";
import { initials } from "@/utils";

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  photoKey?: string | null;
};

export function photoSrc(user: Person) {
  if (!user.photoKey) return "";
  return `/api/avatars/${user.id}?v=${encodeURIComponent(user.photoKey)}`;
}

export function Avatar({
  user,
  className = "avatar",
  style,
  title,
}: {
  user: Person;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const src = photoSrc(user);
  return (
    <span className={src ? `${className} avatar-pic` : className} style={style} title={title}>
      {src ? <img src={src} alt="" /> : initials(user.firstName, user.lastName)}
    </span>
  );
}
