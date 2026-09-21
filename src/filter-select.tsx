"use client";

import { useEffect, useId, useRef, useState } from "react";

export type FilterSelectOption = {
  value: string;
  label: string;
};

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={`filter-select-chevron${open ? " open" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FilterSelect({
  name,
  defaultValue = "",
  options,
  placeholder = "Any",
  label,
}: {
  name: string;
  defaultValue?: string;
  options: FilterSelectOption[];
  placeholder?: string;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? placeholder;

  function pick(next: string) {
    setValue(next);
    setOpen(false);
  }

  return (
    <div className="filter-field filter-select" ref={rootRef}>
      {label ? (
        <label className="filter-field-label" htmlFor={`${listId}-trigger`}>
          {label}
        </label>
      ) : null}
      <input type="hidden" name={name} value={value} />
      <button
        id={`${listId}-trigger`}
        type="button"
        className={`filter-select-trigger${open ? " open" : ""}${value ? " has-value" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className={`filter-select-value${value ? "" : " placeholder"}`}>{display}</span>
        <ChevronDown open={open} />
      </button>
      {open ? (
        <div className="filter-select-menu" id={listId} role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={`filter-select-option${!value ? " selected" : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick("")}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              className={`filter-select-option${value === opt.value ? " selected" : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(opt.value)}
            >
              <span>{opt.label}</span>
              {value === opt.value ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
