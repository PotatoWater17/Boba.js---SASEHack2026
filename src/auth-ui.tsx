import Image from "next/image";
import type { ReactNode } from "react";

export function AuthBrandLockup() {
  return (
    <div className="nav-brand auth-brand-lockup">
      <b>StudyBuddyBoard</b>
      <span className="tagline">Fuel The Grind</span>
    </div>
  );
}

export function AuthMascot() {
  return (
    <div className="auth-brand">
      <Image
        src="/teddy-bear-face.jpg"
        alt=""
        width={88}
        height={88}
        className="auth-mascot"
      />
    </div>
  );
}

export function AuthPage({
  title,
  children,
  footer,
  brand = "mascot",
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  brand?: "lockup" | "mascot";
}) {
  return (
    <div className="page auth-page">
      {brand === "lockup" ? (
        <div className="auth-brand">
          <AuthBrandLockup />
        </div>
      ) : (
        <AuthMascot />
      )}
      <header className="page-header auth-header">
        <h1 className="page-title">{title}</h1>
      </header>
      <div className="box auth-box">{children}</div>
      {footer ? <div className="auth-footer">{footer}</div> : null}
    </div>
  );
}
