import type { ReactNode } from "react";
import { BrandLockup } from "@/brand-lockup";

export function AuthPage({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="page auth-page">
      <div className="auth-brand">
        <BrandLockup size="md" className="auth-brand-lockup" />
      </div>
      <header className="page-header auth-header">
        <h1 className="page-title">{title}</h1>
      </header>
      <div className="box auth-box">{children}</div>
      {footer ? <div className="auth-footer">{footer}</div> : null}
    </div>
  );
}
