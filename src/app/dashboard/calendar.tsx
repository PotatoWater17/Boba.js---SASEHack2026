"use client";

import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/modal";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type CalMeet = {
  id: string;
  subject: string;
  topic: string;
  meetDate: string;
  time: string;
  location: string;
  size: number;
  maxSize: number;
};

function prettyDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DashCalendar({
  year,
  month,
  today,
  meetings,
}: {
  year: number;
  month: number;
  today: string;
  meetings: CalMeet[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: firstDow });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const byDate = new Map<string, CalMeet[]>();
  for (const m of meetings) {
    if (!m.meetDate) continue;
    const list = byDate.get(m.meetDate) || [];
    list.push(m);
    byDate.set(m.meetDate, list);
  }

  const picked = open ? byDate.get(open) || [] : [];

  return (
    <>
      <div className="cal">
        <div className="cal-grid">
          {DAYS.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {blanks.map((_, i) => (
            <div key={`e${i}`} className="cal-day empty" />
          ))}
          {days.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const count = byDate.get(dateStr)?.length || 0;
            return (
              <button
                key={day}
                type="button"
                className={`cal-day${count ? " has-meet" : ""}${dateStr === today ? " today" : ""}`}
                onClick={() => setOpen(dateStr)}
                aria-label={
                  count
                    ? `${prettyDate(dateStr)}, ${count} meetup${count === 1 ? "" : "s"}`
                    : prettyDate(dateStr)
                }
              >
                <div className="cal-day-num">{day}</div>
                {count > 0 ? <div className="cal-dot">{count}</div> : null}
              </button>
            );
          })}
        </div>
      </div>

      <Modal
        open={Boolean(open)}
        onClose={() => setOpen(null)}
        title={open ? prettyDate(open) : ""}
        titleId="cal-pop-title"
      >
        {picked.length === 0 ? (
          <p className="text-muted">No meetups this day.</p>
        ) : (
          <div className="dash-meet-list" style={{ margin: "0 0 16px" }}>
            {picked.map((m) => (
              <Link key={m.id} href={`/meetings/${m.id}`} className="dash-meet">
                <div className="dash-meet-main">
                  <b>
                    {m.subject}
                    {m.topic ? ` — ${m.topic}` : ""}
                  </b>
                  <div className="dash-meet-meta">
                    {m.time} · {m.location}
                  </div>
                </div>
                <span className="dash-meet-count">
                  {m.size}/{m.maxSize}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
