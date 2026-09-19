import Link from "next/link";
import { redirect } from "next/navigation";
import { joinMeeting } from "@/app/actions";
import { Avatar } from "@/avatar";
import {
  COURSES,
  formatMeetDate,
  getMe,
  GROUP_KINDS,
  groupKindLabel,
  meetingMatchScore,
  MEETUP_STYLES,
  PAGE_SIZE,
  prisma,
  splitList,
  UNIVERSITIES,
} from "@/lib";

export default async function BrowseMeetupsPage({
  searchParams,
}: {
  searchParams: Promise<{
    subject?: string;
    page?: string;
    mine?: string;
    kind?: string;
    style?: string;
    uni?: string;
  }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const { subject, page: pageRaw, mine, kind, style, uni: uniRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const onlyMine = mine === "1";
  const myClasses = [...splitList(me.needHelp), ...splitList(me.canHelp)];
  const allSchools = uniRaw === "all" || uniRaw === "";
  const uniFilter = allSchools ? "" : (uniRaw || me.university || "").trim();

  const meetings = await prisma.meeting.findMany({
    where: {
      ...(subject ? { subject } : {}),
      ...(kind ? { groupKind: kind } : {}),
      ...(style ? { style } : {}),
      ...(uniFilter ? { university: { contains: uniFilter } } : {}),
    },
    include: { members: { include: { user: true } } },
  });

  const ranked = meetings
    .map((m) => ({
      meeting: m,
      score: meetingMatchScore(m.subject, me, m.university),
    }))
    .filter((row) => {
      if (!onlyMine) return true;
      if (myClasses.length === 0) return true;
      return row.score > 0;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const bTime = b.meeting.createdAt ? new Date(b.meeting.createdAt).getTime() : 0;
      const aTime = a.meeting.createdAt ? new Date(a.meeting.createdAt).getTime() : 0;
      return bTime - aTime;
    });

  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = ranked.slice(start, start + PAGE_SIZE);
  const filtersOn = Boolean(subject || onlyMine || kind || style || allSchools || (uniRaw && uniRaw !== me.university));

  function href(nextPage: number, extra?: { uni?: string }) {
    const params = new URLSearchParams();
    if (subject) params.set("subject", subject);
    if (kind) params.set("kind", kind);
    if (style) params.set("style", style);
    if (onlyMine) params.set("mine", "1");
    const nextUni = extra?.uni ?? (allSchools ? "all" : uniFilter);
    if (nextUni === "all") params.set("uni", "all");
    else if (nextUni && nextUni !== me.university) params.set("uni", nextUni);
    if (nextPage > 1) params.set("page", String(nextPage));
    const q = params.toString();
    return q ? `/find/browse?${q}` : "/find/browse";
  }

  return (
    <div className="page">
      <header className="page-header">
        <Link href="/find" className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
          ← Find Buddies
        </Link>
        <h1 className="page-title">Browse Meetups</h1>
        {myClasses.length ? (
          <p>
            Matching against: {myClasses.join(", ")}.{" "}
            <Link href="/profile/me?edit=1" style={{ textDecoration: "underline" }}>
              Edit preferences
            </Link>
          </p>
        ) : (
          <p>
            Add classes on your profile to see better matches first.{" "}
            <Link href="/profile/me?edit=1" style={{ textDecoration: "underline" }}>
              Edit preferences
            </Link>
          </p>
        )}
      </header>

      <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 16px", alignItems: "center" }}>
        <input
          className="field"
          name="uni"
          list="uni-list"
          defaultValue={allSchools ? "" : uniFilter}
          placeholder="Search or type any school name"
          style={{ width: 260, margin: 0 }}
        />
        <datalist id="uni-list">
          {UNIVERSITIES.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <select className="field" name="subject" defaultValue={subject || ""} style={{ width: "auto", margin: 0 }}>
          <option value="">All subjects</option>
          {COURSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="field" name="kind" defaultValue={kind || ""} style={{ width: "auto", margin: 0 }}>
          <option value="">Any group size</option>
          {GROUP_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <select className="field" name="style" defaultValue={style || ""} style={{ width: "auto", margin: 0 }}>
          <option value="">Any style</option>
          {MEETUP_STYLES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" name="mine" value="1" defaultChecked={onlyMine} />
          Only my preferred classes
        </label>
        <button className="btn" type="submit">
          Filter
        </button>
        {uniFilter ? (
          <Link className="pill" href={href(1, { uni: "all" })}>
            All schools
          </Link>
        ) : null}
        {filtersOn ? (
          <Link className="pill" href="/find/browse">
            Clear
          </Link>
        ) : null}
      </form>

      <p style={{ fontSize: 14, color: "#666", marginTop: 0 }}>
        Showing {total === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total} groups
        {uniFilter ? ` at ${uniFilter}` : " across all schools"}
        {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ""}
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {pageRows.length === 0 ? (
          <div className="card">
            No groups match these filters yet. <Link href="/find/create">Create a meetup</Link>
          </div>
        ) : (
          pageRows.map(({ meeting: m, score }) => {
            const joined = m.members.some((mem) => mem.userId === me.id);
            const full = m.members.length >= m.maxSize;
            return (
              <div key={m.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <Link href={`/meetings/${m.id}`}>
                      <b>{m.subject}</b>
                    </Link>
                    {score >= 100 ? <span className="bubble" style={{ marginLeft: 8 }}>Recommended</span> : null}
                    {score > 0 && score < 100 ? (
                      <span className="tag" style={{ marginLeft: 8 }}>
                        Matches your profile
                      </span>
                    ) : null}
                    <div className="meet-badges">
                      <span className={`badge kind-${m.groupKind || "small"}`}>
                        {groupKindLabel(m.groupKind || "small")}
                      </span>
                      {m.style ? <span className="badge style">{m.style}</span> : null}
                      {m.university ? <span className="badge uni">{m.university}</span> : null}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {splitList(m.topic).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div style={{ color: "#555", marginTop: 4 }}>
                      {m.meetDate ? `${formatMeetDate(m.meetDate)} · ` : ""}
                      {m.time} · {m.location}
                    </div>
                    {m.notes ? <p className="meeting-note">{m.notes}</p> : null}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>
                      {m.members.length}/{m.maxSize} attending
                    </div>
                    {!joined && !full ? (
                      <form action={joinMeeting} style={{ marginTop: 8 }}>
                        <input type="hidden" name="meetingId" value={m.id} />
                        <button className="btn" type="submit">
                          Join
                        </button>
                      </form>
                    ) : (
                      <Link className="pill" href={`/meetings/${m.id}`} style={{ display: "inline-block", marginTop: 8 }}>
                        {joined ? "Open" : "Full"}
                      </Link>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                  {m.members.map((mem) => (
                    <Link key={mem.id} href={`/profile/${mem.userId}`} title={mem.user.firstName}>
                      <Avatar user={mem.user} />
                    </Link>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 ? (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 20, flexWrap: "wrap" }}>
          {currentPage > 1 ? (
            <Link className="pill" href={href(currentPage - 1)}>
              ← Prev
            </Link>
          ) : (
            <span className="pill" style={{ opacity: 0.4 }}>
              ← Prev
            </span>
          )}
          <span style={{ alignSelf: "center", fontSize: 14 }}>
            Page {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link className="pill" href={href(currentPage + 1)}>
              Next →
            </Link>
          ) : (
            <span className="pill" style={{ opacity: 0.4 }}>
              Next →
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
