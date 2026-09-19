"use client";

import { useActionState, useMemo, useState } from "react";
import { createMeeting, leaveMeeting, updateMeeting } from "@/app/actions";
import { COURSES, GROUP_KINDS, LOCATIONS, MEETUP_STYLES, topicsFor, type GroupKindId } from "@/courses";
import { MAJORS } from "@/majors";
import { searchUniversities, UNIVERSITIES } from "@/universities";

export function ClassBubbles({
  label,
  name,
  initial = [],
}: {
  label: string;
  name: string;
  initial?: string[];
}) {
  const [items, setItems] = useState<string[]>(initial);
  const [custom, setCustom] = useState("");
  const [pick, setPick] = useState("");

  function add(value: string) {
    const cleaned = value.trim();
    if (!cleaned) return;
    if (items.some((item) => item.toLowerCase() === cleaned.toLowerCase())) return;
    setItems([...items, cleaned]);
  }

  function remove(value: string) {
    setItems(items.filter((item) => item !== value));
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <select
          className="field"
          style={{ margin: 0, width: "auto", minWidth: 180 }}
          value={pick}
          onChange={(e) => setPick(e.target.value)}
        >
          <option value="">Pick a class…</option>
          {COURSES.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          onClick={() => {
            add(pick);
            setPick("");
          }}
        >
          Add
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input
          className="field"
          style={{ margin: 0, flex: 1 }}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Or type a custom class"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(custom);
              setCustom("");
            }
          }}
        />
        <button
          type="button"
          className="pill"
          onClick={() => {
            add(custom);
            setCustom("");
          }}
        >
          Add custom
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 28 }}>
        {items.map((item) => (
          <span key={item} className="bubble">
            {item}
            <button type="button" className="bubble-x" onClick={() => remove(item)} aria-label={`Remove ${item}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input type="hidden" name={name} value={items.join(", ")} />
    </div>
  );
}

export function UniversityPicker({
  name = "university",
  defaultValue = "",
  required = true,
  label = "University",
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  label?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const trimmed = query.trim();
  const filtered = useMemo(() => searchUniversities(trimmed, 24), [trimmed]);
  const exact = useMemo(
    () => UNIVERSITIES.find((u) => u.toLowerCase() === trimmed.toLowerCase()),
    [trimmed],
  );
  const showCustom = trimmed.length >= 3 && !exact;

  function pick(value: string) {
    setQuery(value);
    setOpen(false);
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ marginBottom: 6 }}>{label}</div>
      <div className="topic-picker">
        <input
          className="field"
          name={name}
          style={{ marginBottom: 0 }}
          value={query}
          placeholder="Type to search schools…"
          autoComplete="off"
          required={required}
          minLength={required ? 3 : undefined}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) pick(filtered[0]);
              else if (showCustom) pick(trimmed);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && (trimmed.length >= 2 || showCustom) ? (
          <div className="topic-menu">
            {showCustom ? (
              <button
                type="button"
                className="topic-option topic-option-custom"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(trimmed)}
              >
                Use &quot;{trimmed}&quot;
              </button>
            ) : null}
            {filtered.map((u) => (
              <button
                key={u}
                type="button"
                className="topic-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(u)}
              >
                {u}
              </button>
            ))}
            {filtered.length === 0 && !showCustom ? (
              <div className="topic-empty">No match — type at least 3 characters to use a custom name.</div>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 12px" }}>
        Search 6,000+ schools or enter your own if it&apos;s not listed.
      </p>
    </div>
  );
}

export function MajorPicker({
  name = "major",
  defaultValue = "",
  required = false,
  label = "Major",
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  label?: string;
}) {
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q ? MAJORS.slice(0, 18) : MAJORS.filter((m) => m.toLowerCase().includes(q));
    return list.slice(0, 24);
  }, [query]);

  function pick(value: string) {
    setQuery(value);
    setOpen(false);
  }

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ marginBottom: 6 }}>{label}</div>
      <div className="topic-picker">
        <input
          className="field"
          name={name}
          style={{ marginBottom: 0 }}
          value={query}
          placeholder="Type to search majors…"
          autoComplete="off"
          required={required}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) pick(filtered[0]);
            }
          }}
          onBlur={() => {
            const hit = MAJORS.find((m) => m.toLowerCase() === query.trim().toLowerCase());
            setQuery(hit || "");
            setTimeout(() => setOpen(false), 150);
          }}
        />
        {open ? (
          <div className="topic-menu">
            {filtered.length === 0 ? (
              <div className="topic-empty">No match — try another search.</div>
            ) : (
              filtered.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="topic-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(m)}
                >
                  {m}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
      <p style={{ fontSize: 13, color: "#666", margin: "6px 0 12px" }}>Pick a major from the list.</p>
    </div>
  );
}

/** Subject dropdown + multi-topic searchable picker. */
export function SubjectTopicFields({
  defaultSubject = "Calc 2",
  initialTopics = [],
}: {
  defaultSubject?: string;
  initialTopics?: string[];
}) {
  const [subject, setSubject] = useState(defaultSubject);
  const [selected, setSelected] = useState<string[]>(initialTopics);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const topics = topicsFor(subject);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((t) => t.toLowerCase().includes(q));
  }, [topics, query]);

  function addTopic(value: string) {
    const cleaned = value.trim();
    if (cleaned.length < 2) return;
    if (selected.some((t) => t.toLowerCase() === cleaned.toLowerCase())) return;
    setSelected([...selected, cleaned]);
    setQuery("");
  }

  return (
    <>
      <label>
        Subject
        <select
          className="field"
          name="subject"
          required
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setSelected([]);
            setQuery("");
            setOpen(true);
          }}
        >
          {COURSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6 }}>Topics (add one or more)</div>
        <div className="topic-picker">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="field"
              style={{ marginBottom: 0, flex: 1 }}
              value={query}
              placeholder="Type to search, then Add"
              autoComplete="off"
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic(query);
                  setOpen(false);
                }
              }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
            />
            <button
              type="button"
              className="btn"
              onClick={() => {
                addTopic(query);
                setOpen(false);
              }}
            >
              Add
            </button>
          </div>
          {open ? (
            <div className="topic-menu">
              {filtered.length === 0 ? (
                <div className="topic-empty">No match — type a custom topic and click Add.</div>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="topic-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      addTopic(t);
                      setOpen(false);
                    }}
                  >
                    {t}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 28, marginTop: 8 }}>
          {selected.map((item) => (
            <span key={item} className="bubble">
              {item}
              <button
                type="button"
                className="bubble-x"
                onClick={() => setSelected(selected.filter((t) => t !== item))}
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input type="hidden" name="topic" value={selected.join(", ")} />
        <p style={{ fontSize: 13, color: "#666", margin: "6px 0 0" }}>
          Pick from the list or add a custom topic. You need at least one.
        </p>
      </div>
    </>
  );
}

export function LocationField({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <label>
      Location
      <input
        className="field"
        name="location"
        list="location-ideas"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Student Center, Library, Zoom…"
        required
        maxLength={120}
      />
      <datalist id="location-ideas">
        {LOCATIONS.map((loc) => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
    </label>
  );
}

export function CreateMeetupForm({
  defaultUniversity = "",
  meeting,
}: {
  defaultUniversity?: string;
  meeting?: {
    id: string;
    subject: string;
    topic: string;
    meetDate: string;
    time: string;
    location: string;
    university: string;
    notes: string;
    groupKind: string;
    style: string;
    maxSize: number;
    memberCount?: number;
  };
}) {
  const editing = Boolean(meeting);
  const [state, action, pending] = useActionState(editing ? updateMeeting : createMeeting, null);
  const [meetDate, setMeetDate] = useState(meeting?.meetDate || "");
  const [time, setTime] = useState(() => {
    if (!meeting?.time) return "18:00";
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(meeting.time.trim());
    if (!match) return "18:00";
    let hour = Number(match[1]);
    const minute = match[2];
    const suffix = match[3].toUpperCase();
    if (suffix === "PM" && hour < 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${minute}`;
  });
  const [groupKind, setGroupKind] = useState<GroupKindId>(
    (meeting?.groupKind as GroupKindId) || "small",
  );
  const [maxSize, setMaxSize] = useState(String(meeting?.maxSize || "5"));
  const [style, setStyle] = useState<string>(meeting?.style || MEETUP_STYLES[0]);
  const [notes, setNotes] = useState(meeting?.notes || "");

  const kind = GROUP_KINDS.find((k) => k.id === groupKind) ?? GROUP_KINDS[1];
  const minSize = Math.max(kind.min, meeting?.memberCount || 1);

  function onKindChange(next: GroupKindId) {
    setGroupKind(next);
    const k = GROUP_KINDS.find((x) => x.id === next);
    if (k) setMaxSize(String(Math.max(k.defaultSize, meeting?.memberCount || 1)));
  }

  const topics = meeting?.topic
    ? meeting.topic.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <form action={action} className="box">
      {editing ? <input type="hidden" name="meetingId" value={meeting!.id} /> : null}
      {state?.error ? <p className="err">{state.error}</p> : null}
      <UniversityPicker defaultValue={meeting?.university || defaultUniversity} />
      <SubjectTopicFields defaultSubject={meeting?.subject || "Calc 2"} initialTopics={topics} />
      <label>
        Date
        <input
          className="field"
          name="meetDate"
          type="date"
          required
          value={meetDate}
          onChange={(e) => setMeetDate(e.target.value)}
        />
      </label>
      <label>
        Meeting time
        <input
          className="field"
          name="time"
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </label>
      <LocationField defaultValue={meeting?.location || ""} />
      <label>
        Group size category
        <select
          className="field"
          name="groupKind"
          required
          value={groupKind}
          onChange={(e) => onKindChange(e.target.value as GroupKindId)}
        >
          {GROUP_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      {kind.id === "partner" ? (
        <input type="hidden" name="maxSize" value="2" />
      ) : (
        <label>
          Max people ({minSize}–{kind.max})
          <input
            className="field"
            name="maxSize"
            type="number"
            min={minSize}
            max={kind.max}
            step={1}
            required
            value={maxSize}
            onChange={(e) => setMaxSize(e.target.value)}
          />
        </label>
      )}
      <label>
        Meetup style
        <select
          className="field"
          name="style"
          required
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          {MEETUP_STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notes / additional info (optional)
        <textarea
          className="field"
          name="notes"
          rows={3}
          maxLength={300}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Bring calculator, Zoom link, room number, what to study ahead…"
        />
      </label>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? (editing ? "Saving…" : "Posting…") : editing ? "Save changes" : "Post meetup"}
      </button>
    </form>
  );
}

export function LeaveGroupButton({ meetingId }: { meetingId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="pill" onClick={() => setOpen(true)}>
        Leave group
      </button>

      {open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="modal">
            <h3 id="leave-title" style={{ marginTop: 0 }}>
              Leave this group?
            </h3>
            <p style={{ color: "#555" }}>
              You&apos;ll be removed from the meetup and won&apos;t see the group chat unless you join again.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="pill" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <form action={leaveMeeting}>
                <input type="hidden" name="meetingId" value={meetingId} />
                <button type="submit" className="btn">
                  Confirm leave
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
