"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createMeeting,
  deleteMeeting,
  leaveMeeting,
  removeMeetingMember,
  updateMeeting,
} from "@/app/actions";
import {
  COURSES,
  GROUP_KINDS,
  LOCATIONS,
  MEETUP_STYLES,
  searchCourses,
  topicsFor,
  type GroupKindId,
} from "@/courses";
import { MAJORS } from "@/majors";
import { searchUniversities, UNIVERSITIES } from "@/universities";
import { isYearOption, YEAR_OPTIONS } from "@/years";

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
  const [pick, setPick] = useState("");
  const [open, setOpen] = useState(false);

  const trimmed = pick.trim();
  const suggestions = useMemo(() => {
    return searchCourses(pick, 48).filter(
      (course) => !items.some((item) => item.toLowerCase() === course.toLowerCase()),
    );
  }, [pick, items]);
  const exact = useMemo(
    () => COURSES.find((course) => course.toLowerCase() === trimmed.toLowerCase()),
    [trimmed],
  );
  const alreadyAdded = trimmed
    ? items.some((item) => item.toLowerCase() === trimmed.toLowerCase())
    : false;
  const showCustom = trimmed.length >= 2 && !exact && !alreadyAdded;

  function add(value: string) {
    const cleaned = value.trim();
    if (!cleaned) return;
    if (items.some((item) => item.toLowerCase() === cleaned.toLowerCase())) return;
    setItems([...items, cleaned]);
    setPick("");
    setOpen(false);
  }

  function remove(value: string) {
    setItems(items.filter((item) => item !== value));
  }

  return (
    <div className="class-bubbles">
      <div className="class-bubbles-label">{label}</div>
      <div className="class-bubbles-row">
        <div className="topic-picker class-bubbles-picker">
          <input
            className="field"
            value={pick}
            placeholder="Search courses or type your own"
            maxLength={80}
            autoComplete="off"
            aria-label={label}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setPick(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (suggestions[0]) add(suggestions[0]);
                else if (showCustom) add(trimmed);
              }
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open ? (
            <div className="topic-menu">
              {showCustom ? (
                <button
                  type="button"
                  className="topic-option topic-option-custom"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(trimmed)}
                >
                  Add &quot;{trimmed}&quot;
                </button>
              ) : null}
              {suggestions.map((course) => (
                <button
                  key={course}
                  type="button"
                  className="topic-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(course)}
                >
                  {course}
                </button>
              ))}
              {suggestions.length === 0 && !showCustom ? (
                <div className="topic-empty">
                  {trimmed ? "No match — type a course name to add it." : "Start typing to search 1,100+ courses."}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <button type="button" className="btn class-bubbles-add" disabled={!trimmed} onClick={() => add(pick)}>
          Add
        </button>
      </div>
      {items.length ? (
        <div className="class-bubbles-chips">
          {items.map((item) => (
            <span key={item} className="bubble">
              {item}
              <button type="button" className="bubble-x" onClick={() => remove(item)} aria-label={`Remove ${item}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted class-bubbles-hint">Search 1,100+ courses or type your own — used for buddy and group matching.</p>
      )}
      <input type="hidden" name={name} value={items.join(", ")} />
    </div>
  );
}

/** Exam prep fields for buddy matching and profile. */
export function ExamPrepFields({
  defaultCourse = "",
  defaultDate = "",
  defaultTopics = [],
  defaultStyle = "",
  showYearFilter = false,
  defaultYear = "",
  allowPastExamDate = false,
}: {
  defaultCourse?: string;
  defaultDate?: string;
  defaultTopics?: string[];
  defaultStyle?: string;
  showYearFilter?: boolean;
  defaultYear?: string;
  allowPastExamDate?: boolean;
}) {
  const [course, setCourse] = useState(defaultCourse);
  const [courseDraft, setCourseDraft] = useState("");
  const [courseOpen, setCourseOpen] = useState(false);
  const [topics, setTopics] = useState<string[]>(defaultTopics);
  const [topicDraft, setTopicDraft] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);

  const courseQuery = courseDraft.trim();
  const courseSuggestions = useMemo(() => searchCourses(courseDraft, 48), [courseDraft]);
  const exactCourse = useMemo(
    () => COURSES.find((c) => c.toLowerCase() === courseQuery.toLowerCase()),
    [courseQuery],
  );
  const showCustomCourse = courseQuery.length >= 2 && !exactCourse;

  const topicSuggestions = useMemo(() => topicsFor(course), [course]);
  const filteredTopics = useMemo(() => {
    const q = topicDraft.trim().toLowerCase();
    if (!q) return topicSuggestions.slice(0, 12);
    return topicSuggestions.filter((t) => t.toLowerCase().includes(q)).slice(0, 12);
  }, [topicSuggestions, topicDraft]);

  function selectCourse(value: string) {
    const cleaned = value.trim().slice(0, 80);
    if (cleaned.length < 2) return;
    if (cleaned.toLowerCase() !== course.toLowerCase()) setTopics([]);
    setCourse(cleaned);
    setCourseDraft("");
    setCourseOpen(false);
    setTopicDraft("");
  }

  function addTopic(value: string) {
    if (!course) return;
    const cleaned = value.trim();
    if (cleaned.length < 2) return;
    if (topics.some((t) => t.toLowerCase() === cleaned.toLowerCase())) return;
    setTopics([...topics, cleaned]);
    setTopicDraft("");
  }

  return (
    <div className="exam-prep-fields">
      <p className="exam-prep-lead">Upcoming exam prep (optional — improves buddy matches)</p>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6 }}>Subject</div>
        {course ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <span className="bubble">
              {course}
              <button
                type="button"
                className="bubble-x"
                onClick={() => {
                  setCourse("");
                  setTopics([]);
                  setTopicDraft("");
                }}
                aria-label={`Remove ${course}`}
              >
                ×
              </button>
            </span>
          </div>
        ) : null}
        {!course ? (
          <div className="topic-picker">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                className="field"
                style={{ marginBottom: 0, flex: 1 }}
                value={courseDraft}
                placeholder="Search courses or type your own"
                maxLength={80}
                autoComplete="off"
                onFocus={() => setCourseOpen(true)}
                onChange={(e) => {
                  setCourseDraft(e.target.value);
                  setCourseOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (courseSuggestions[0]) selectCourse(courseSuggestions[0]);
                    else if (showCustomCourse) selectCourse(courseQuery);
                  }
                }}
                onBlur={() => setTimeout(() => setCourseOpen(false), 150)}
              />
              <button
                type="button"
                className="btn"
                disabled={courseQuery.length < 2}
                onClick={() => selectCourse(showCustomCourse ? courseQuery : courseSuggestions[0] || courseQuery)}
              >
                Add
              </button>
            </div>
            {courseOpen ? (
              <div className="topic-menu">
                {showCustomCourse ? (
                  <button
                    type="button"
                    className="topic-option topic-option-custom"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectCourse(courseQuery)}
                  >
                    Add &quot;{courseQuery}&quot;
                  </button>
                ) : null}
                {courseSuggestions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="topic-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectCourse(c)}
                  >
                    {c}
                  </button>
                ))}
                {courseSuggestions.length === 0 && !showCustomCourse ? (
                  <div className="topic-empty">
                    {courseQuery ? "No match — type a course name to add it." : "Start typing to search 1,100+ courses."}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <input type="hidden" name="examCourse" value={course} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6 }}>
          Topics to focus on{course ? ` for ${course}` : ""}
        </div>
        <div className="topic-picker">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="field"
              style={{ marginBottom: 0, flex: 1 }}
              value={topicDraft}
              placeholder={course ? "Search topics or type your own" : "Pick a subject first"}
              autoComplete="off"
              disabled={!course}
              onFocus={() => setTopicOpen(true)}
              onChange={(e) => {
                setTopicDraft(e.target.value);
                setTopicOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic(topicDraft);
                  setTopicOpen(false);
                }
              }}
              onBlur={() => setTimeout(() => setTopicOpen(false), 150)}
            />
            <button
              type="button"
              className="btn"
              disabled={!course}
              onClick={() => {
                addTopic(topicDraft);
                setTopicOpen(false);
              }}
            >
              Add
            </button>
          </div>
          {topicOpen && course ? (
            <div className="topic-menu">
              {topicDraft.trim().length >= 2 &&
              !filteredTopics.some((t) => t.toLowerCase() === topicDraft.trim().toLowerCase()) ? (
                <button
                  type="button"
                  className="topic-option topic-option-custom"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    addTopic(topicDraft);
                    setTopicOpen(false);
                  }}
                >
                  Add &quot;{topicDraft.trim()}&quot;
                </button>
              ) : null}
              {filteredTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="topic-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    addTopic(t);
                    setTopicOpen(false);
                  }}
                >
                  {t}
                </button>
              ))}
              {filteredTopics.length === 0 && topicDraft.trim().length < 2 ? (
                <div className="topic-empty">Pick from suggestions or type your own topic.</div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 28, marginTop: 8 }}>
          {topics.map((item) => (
            <span key={item} className="bubble">
              {item}
              <button
                type="button"
                className="bubble-x"
                onClick={() => setTopics(topics.filter((t) => t !== item))}
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <input type="hidden" name="examTopics" value={topics.join(", ")} />
      </div>
      <label>
        Exam date
        <input
          className="field"
          type="date"
          name="examDate"
          defaultValue={defaultDate}
          min={allowPastExamDate ? undefined : new Date().toISOString().slice(0, 10)}
        />
      </label>
      <label>
        Preferred study style
        <select className="field" name="studyStyle" defaultValue={defaultStyle}>
          <option value="">Any style</option>
          {MEETUP_STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      {showYearFilter ? (
        <YearPicker label="Filter by year (optional)" defaultValue={defaultYear} allowAny placeholder="Any year" />
      ) : null}
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

export function YearPicker({
  name = "year",
  defaultValue = "",
  required = false,
  label = "Year",
  placeholder = "Select year…",
  allowAny = false,
  hideLabel = false,
  compact = false,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  label?: string;
  placeholder?: string;
  allowAny?: boolean;
  hideLabel?: boolean;
  compact?: boolean;
}) {
  const legacy = defaultValue && !isYearOption(defaultValue);
  const field = (
    <select
      className="field"
      name={name}
      defaultValue={defaultValue}
      required={required}
      style={compact ? { margin: 0 } : undefined}
    >
          {allowAny ? (
            <option value="">Any year</option>
          ) : (
            <option value="">{placeholder}</option>
          )}
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
          {legacy ? (
            <option value={defaultValue}>{defaultValue}</option>
          ) : null}
    </select>
  );

  return (
    <div style={{ marginBottom: compact ? 0 : 4 }}>
      {hideLabel ? field : <label>{label}{field}</label>}
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

  const subjectSuggestions = useMemo(() => searchCourses(subject, 50), [subject]);
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
        <input
          className="field"
          name="subject"
          list="subject-suggestions"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setSelected([]);
            setQuery("");
            setOpen(true);
          }}
          placeholder="Search 1,100+ courses or type your own"
          required
          maxLength={80}
          autoComplete="off"
        />
        <datalist id="subject-suggestions">
          {subjectSuggestions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
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
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>
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
    isPrivate?: boolean;
    requireApproval?: boolean;
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
  const [isPrivate, setIsPrivate] = useState(Boolean(meeting?.isPrivate));
  const [requireApproval, setRequireApproval] = useState(
    Boolean(meeting?.requireApproval && !meeting?.isPrivate),
  );

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
      <fieldset className="meet-privacy-fieldset">
        <legend>Privacy &amp; access</legend>
        <label className="meet-privacy-option">
          <input
            type="checkbox"
            name="isPrivate"
            value="1"
            checked={isPrivate}
            onChange={(e) => {
              const next = e.target.checked;
              setIsPrivate(next);
              if (next) setRequireApproval(false);
            }}
          />
          Private group — hidden from browse, owner invites only (no join requests)
        </label>
        {!isPrivate ? (
          <label className="meet-privacy-option">
            <input
              type="checkbox"
              name="requireApproval"
              value="1"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
            />
            Require my approval before someone can join
          </label>
        ) : null}
      </fieldset>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? (editing ? "Saving…" : "Posting…") : editing ? "Save changes" : "Post meetup"}
      </button>
    </form>
  );
}

export function LeaveGroupButton({
  meetingId,
  soloOwner = false,
}: {
  meetingId: string;
  soloOwner?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="pill" onClick={() => setOpen(true)}>
        {soloOwner ? "Leave & delete group" : "Leave group"}
      </button>

      {open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="modal">
            <h3 id="leave-title" style={{ marginTop: 0 }}>
              {soloOwner ? "Delete this empty group?" : "Leave this group?"}
            </h3>
            <p style={{ color: "#555" }}>
              {soloOwner
                ? "You're the only member — leaving will permanently delete this study group."
                : "You'll be removed from the meetup and won't see the group chat unless you join again."}
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

export function RemoveMemberButton({
  meetingId,
  userId,
  name,
}: {
  meetingId: string;
  userId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="pill meet-remove-member-btn" onClick={() => setOpen(true)}>
        Remove
      </button>

      {open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="remove-member-title">
          <div className="modal">
            <h3 id="remove-member-title" style={{ marginTop: 0 }}>
              Remove {name}?
            </h3>
            <p style={{ color: "#555" }}>
              They&apos;ll lose access to this group. Their past messages will show as &quot;Removed user&quot;.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="pill" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <form action={removeMeetingMember}>
                <input type="hidden" name="meetingId" value={meetingId} />
                <input type="hidden" name="userId" value={userId} />
                <button type="submit" className="btn">
                  Remove member
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function DeleteGroupButton({ meetingId, subject }: { meetingId: string; subject: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="pill" onClick={() => setOpen(true)}>
        Delete group
      </button>

      {open ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-group-title">
          <div className="modal">
            <h3 id="delete-group-title" style={{ marginTop: 0 }}>
              Delete this study group?
            </h3>
            <p style={{ color: "#555" }}>
              Permanently remove <b>{subject}</b>, its chat history, and all member access. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" className="pill" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <form action={deleteMeeting}>
                <input type="hidden" name="meetingId" value={meetingId} />
                <button type="submit" className="btn">
                  Delete group
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
