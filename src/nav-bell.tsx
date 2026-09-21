"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  acceptFriend,
  acceptMeetupInvite,
  approveJoinRequest,
  declineFriend,
  declineJoinRequest,
  declineMeetupInvite,
  dismissGroupActivity,
} from "@/app/actions";
import { Avatar } from "@/avatar";
import { visibleFriendNotices, visibleGroupNotices } from "@/inbox-ack";
import { useInboxLive } from "@/inbox-live";
import type { InboxGroupActivity } from "@/inbox-types";
import { timeAgo } from "@/utils";

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 5 2 6.5 2 6.5H4.5s2-1.5 2-6.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function openFriendId(pathname: string) {
  const match = pathname.match(/^\/friends\/([^/?#]+)/);
  return match?.[1];
}

function openMeetingId(pathname: string) {
  const match = pathname.match(/^\/meetings\/([^/?#]+)/);
  return match?.[1];
}

function activityCopy(row: InboxGroupActivity) {
  if (row.kind === "kicked") return `You were removed from ${row.subject}`;
  if (row.kind === "disbanded") return `${row.subject} was disbanded`;
  return `${row.actorName || "Someone"} left ${row.subject}`;
}

function activityHref(row: InboxGroupActivity) {
  if (row.kind === "leave" && row.meetingId) return `/meetings/${row.meetingId}`;
  return "/groups";
}

export function NavBell() {
  const pathname = usePathname();
  const { inbox, refreshInbox } = useInboxLive();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState("");
  const [panelPos, setPanelPos] = useState({ top: 64, right: 12 });
  const [, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const requests = inbox.buddyRequests || [];
  const invites = inbox.meetupInvites || [];
  const joins = inbox.joinRequests || [];
  const activity = inbox.groupActivity || [];
  const friendOpen = openFriendId(pathname);
  const meetingOpen = openMeetingId(pathname);
  const dms = (inbox.dms || []).filter((row) => row.fromId !== friendOpen);
  const groups = (inbox.groups || []).filter((row) => row.meetingId !== meetingOpen);
  const requestCount = requests.length + invites.length + joins.length;
  const count =
    requestCount +
    visibleFriendNotices(inbox.dms || [], friendOpen) +
    visibleGroupNotices(inbox.groups || [], meetingOpen) +
    activity.length;
  const hasItems = requestCount + dms.length + groups.length + activity.length > 0;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function place() {
      const btn = wrapRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const width = Math.min(380, window.innerWidth - 24);
      const maxRight = Math.max(8, window.innerWidth - width - 8);
      setPanelPos({
        top: Math.round(r.bottom + 8),
        right: Math.round(Math.max(8, Math.min(window.innerWidth - r.right, maxRight))),
      });
    }
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    place();
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function run(key: string, action: (fd: FormData) => Promise<unknown>, fill: (fd: FormData) => void) {
    if (busy) return;
    setBusy(key);
    const fd = new FormData();
    fd.set("next", "stay");
    fill(fd);
    startTransition(() => {
      void (async () => {
        try {
          await action(fd);
          await refreshInbox();
        } finally {
          setBusy("");
        }
      })();
    });
  }

  return (
    <div className="nav-bell" ref={wrapRef}>
      <button
        type="button"
        className={`btn btn-ghost nav-bell-btn${open ? " open" : ""}`}
        aria-label={count > 0 ? `Notifications, ${count} new` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notifications"
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon />
        {count > 0 ? <span className="nav-bell-badge">{count > 9 ? "9+" : count}</span> : null}
      </button>
      {open && mounted
        ? createPortal(
            <div
              className="nav-bell-panel"
              ref={panelRef}
              role="dialog"
              aria-label="Notifications"
              style={{ top: panelPos.top, right: panelPos.right }}
            >
              <div className="nav-bell-head">Notifications</div>
              {!hasItems ? (
                <p className="nav-bell-empty">You&apos;re all caught up.</p>
              ) : (
                <>
                  {requests.length ? (
                    <section className="nav-bell-section">
                      <h3>Buddy requests</h3>
                      {requests.map((row) => (
                        <div key={row.fromId} className="nav-bell-row">
                          <Link href={`/profile/${row.fromId}`} className="nav-bell-person" onClick={() => setOpen(false)}>
                            <Avatar
                              user={{ id: row.fromId, firstName: row.firstName, lastName: row.lastName, photoKey: row.photoKey }}
                              style={{ width: 40, height: 40, fontSize: 13 }}
                            />
                            <span>
                              <b>
                                {row.firstName} {row.lastName}
                              </b>
                              <span className="nav-bell-meta">wants to be buddies · {timeAgo(row.createdAt)}</span>
                            </span>
                          </Link>
                          <div className="nav-bell-actions">
                            <button
                              type="button"
                              className="btn action-btn"
                              disabled={Boolean(busy)}
                              onClick={() => run(`accept-${row.fromId}`, acceptFriend, (fd) => fd.set("userId", row.fromId))}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-ghost action-btn"
                              disabled={Boolean(busy)}
                              onClick={() => run(`decline-${row.fromId}`, declineFriend, (fd) => fd.set("userId", row.fromId))}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>
                  ) : null}
                  {invites.length ? (
                    <section className="nav-bell-section">
                      <h3>Group invites</h3>
                      {invites.map((row) => (
                        <div key={row.inviteId} className="nav-bell-row">
                          <Link href={`/meetings/${row.meetingId}`} className="nav-bell-person" onClick={() => setOpen(false)}>
                            <Avatar
                              user={{ id: row.fromId, firstName: row.firstName, lastName: row.lastName, photoKey: row.photoKey }}
                              style={{ width: 40, height: 40, fontSize: 13 }}
                            />
                            <span>
                              <b>
                                {row.firstName} {row.lastName}
                              </b>
                              <span className="nav-bell-meta">
                                invited you to {row.subject} · {timeAgo(row.createdAt)}
                              </span>
                            </span>
                          </Link>
                          <div className="nav-bell-actions">
                            <button
                              type="button"
                              className="btn action-btn"
                              disabled={Boolean(busy)}
                              onClick={() =>
                                run(`invite-ok-${row.inviteId}`, acceptMeetupInvite, (fd) => fd.set("inviteId", row.inviteId))
                              }
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-ghost action-btn"
                              disabled={Boolean(busy)}
                              onClick={() =>
                                run(`invite-no-${row.inviteId}`, declineMeetupInvite, (fd) => fd.set("inviteId", row.inviteId))
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>
                  ) : null}
                  {joins.length ? (
                    <section className="nav-bell-section">
                      <h3>Join requests</h3>
                      {joins.map((row) => (
                        <div key={row.requestId} className="nav-bell-row">
                          <Link href={`/meetings/${row.meetingId}`} className="nav-bell-person" onClick={() => setOpen(false)}>
                            <Avatar
                              user={{ id: row.fromId, firstName: row.firstName, lastName: row.lastName, photoKey: row.photoKey }}
                              style={{ width: 40, height: 40, fontSize: 13 }}
                            />
                            <span>
                              <b>
                                {row.firstName} {row.lastName}
                              </b>
                              <span className="nav-bell-meta">
                                wants to join {row.subject} · {timeAgo(row.createdAt)}
                              </span>
                            </span>
                          </Link>
                          <div className="nav-bell-actions">
                            <button
                              type="button"
                              className="btn action-btn"
                              disabled={Boolean(busy)}
                              onClick={() =>
                                run(`join-ok-${row.requestId}`, approveJoinRequest, (fd) => {
                                  fd.set("requestId", row.requestId);
                                  fd.set("meetingId", row.meetingId);
                                })
                              }
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-ghost action-btn"
                              disabled={Boolean(busy)}
                              onClick={() =>
                                run(`join-no-${row.requestId}`, declineJoinRequest, (fd) => {
                                  fd.set("requestId", row.requestId);
                                  fd.set("meetingId", row.meetingId);
                                })
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>
                  ) : null}
                  {dms.length ? (
                    <section className="nav-bell-section">
                      <h3>Messages</h3>
                      {dms.map((row) => (
                        <Link
                          key={row.fromId}
                          href={`/friends/${row.fromId}`}
                          className="nav-bell-row nav-bell-link-row"
                          onClick={() => setOpen(false)}
                        >
                          <span className="nav-bell-person">
                            <Avatar
                              user={{ id: row.fromId, firstName: row.firstName, lastName: row.lastName, photoKey: row.photoKey }}
                              style={{ width: 40, height: 40, fontSize: 13 }}
                            />
                            <span>
                              <b>
                                {row.firstName} {row.lastName}
                              </b>
                              <span className="nav-bell-meta nav-bell-preview">{row.preview}</span>
                              {row.createdAt ? <span className="nav-bell-time">{timeAgo(row.createdAt)}</span> : null}
                            </span>
                          </span>
                          {row.unread > 0 ? (
                            <span className="nav-bell-unread">{row.unread > 9 ? "9+" : row.unread}</span>
                          ) : null}
                        </Link>
                      ))}
                    </section>
                  ) : null}
                  {groups.length ? (
                    <section className="nav-bell-section">
                      <h3>Groups</h3>
                      {groups.map((row) => (
                        <Link
                          key={row.meetingId}
                          href={`/meetings/${row.meetingId}`}
                          className="nav-bell-row nav-bell-link-row"
                          onClick={() => setOpen(false)}
                        >
                          <span className="nav-bell-person">
                            <Avatar
                              user={{
                                id: row.fromId,
                                firstName: row.firstName,
                                lastName: row.lastName,
                                photoKey: row.photoKey,
                              }}
                              style={{ width: 40, height: 40, fontSize: 13 }}
                            />
                            <span>
                              <b>{row.subject}</b>
                              <span className="nav-bell-meta nav-bell-preview">
                                {row.firstName}
                                {row.lastName ? ` ${row.lastName}` : ""}: {row.preview}
                              </span>
                              {row.createdAt ? <span className="nav-bell-time">{timeAgo(row.createdAt)}</span> : null}
                            </span>
                          </span>
                          {row.unread > 0 ? (
                            <span className="nav-bell-unread">{row.unread > 9 ? "9+" : row.unread}</span>
                          ) : null}
                        </Link>
                      ))}
                    </section>
                  ) : null}
                  {activity.length ? (
                    <section className="nav-bell-section">
                      <h3>Activity</h3>
                      {activity.map((row) => {
                        const names = (row.actorName || row.subject || "Group").split(/\s+/);
                        return (
                          <div key={row.noticeId} className="nav-bell-row">
                            <Link
                              href={activityHref(row)}
                              className="nav-bell-person"
                              onClick={() => {
                                run(`seen-${row.noticeId}`, dismissGroupActivity, (fd) => fd.set("noticeId", row.noticeId));
                                setOpen(false);
                              }}
                            >
                              <Avatar
                                user={{
                                  id: row.actorId || row.noticeId,
                                  firstName: names[0] || "G",
                                  lastName: names.slice(1).join(" "),
                                  photoKey: row.actorPhoto,
                                }}
                                style={{ width: 40, height: 40, fontSize: 13 }}
                              />
                              <span>
                                <b>{activityCopy(row)}</b>
                                <span className="nav-bell-meta">{timeAgo(row.createdAt)}</span>
                              </span>
                            </Link>
                            <div className="nav-bell-actions">
                              <button
                                type="button"
                                className="btn-ghost action-btn"
                                disabled={Boolean(busy)}
                                onClick={() =>
                                  run(`seen-${row.noticeId}`, dismissGroupActivity, (fd) => fd.set("noticeId", row.noticeId))
                                }
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </section>
                  ) : null}
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
