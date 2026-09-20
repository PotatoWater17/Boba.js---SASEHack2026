import type { FormEvent } from "react";

/** Skip server round-trip when Enter submits an empty chat form. */
export function blockEmptyChatSubmit(e: FormEvent<HTMLFormElement>) {
  const fd = new FormData(e.currentTarget);
  const text = String(fd.get("text") || "").trim();
  const raw = fd.get("file");
  if (!text && !(raw instanceof File && raw.size > 0)) e.preventDefault();
}
