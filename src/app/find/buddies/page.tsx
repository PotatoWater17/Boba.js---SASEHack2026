import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptFriend, addFriend } from "@/app/actions";
import { MatchNotify } from "./notify";
import { ExamPrepFields, MajorPicker, UniversityPicker } from "@/ui";
import { Avatar } from "@/avatar";
import {
  blockedUserIds,
  buddyMatch,
  examMeetupScore,
  formatMeetDate,
  getMe,
  groupKindLabel,
  prisma,
  splitList,
} from "@/lib";

export default async function FindBuddiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    university?: string;
    major?: string;
    examCourse?: string;
    examDate?: string;
    examTopics?: string;
    studyStyle?: string;
    year?: string;
  }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const q = await searchParams;
  const submitted =
    "university" in q ||
    "major" in q ||
    "examCourse" in q ||
    "examDate" in q ||
    "examTopics" in q ||
    "studyStyle" in q ||
    "year" in q;

  const profileCanHelp = splitList(me.canHelp);

  const prefs = {
    needHelp: me.needHelp,
    canHelp: me.canHelp,
    university: submitted ? String(q.university || "") : me.university,
    major: submitted ? String(q.major || "") : me.major,
    examCourse: submitted ? String(q.examCourse || "") : me.examCourse,
    examDate: submitted ? String(q.examDate || "") : me.examDate,
    examTopics: submitted ? String(q.examTopics || "") : me.examTopics,
    studyStyle: submitted ? String(q.studyStyle || "") : me.studyStyle,
    year: submitted ? String(q.year || "") : "",
  };

  const stayParams = new URLSearchParams();
  stayParams.set("university", prefs.university);
  stayParams.set("major", prefs.major);
  stayParams.set("examCourse", prefs.examCourse);
  stayParams.set("examDate", prefs.examDate);
  stayParams.set("examTopics", prefs.examTopics);
  stayParams.set("studyStyle", prefs.studyStyle);
  stayParams.set("year", prefs.year);
  const stay = `/find/buddies?${stayParams.toString()}`;

  const blocked = submitted ? await blockedUserIds(me.id) : new Set<string>();
  const people = submitted
    ? await prisma.user.findMany({
        where: { id: { not: me.id } },
        orderBy: { firstName: "asc" },
      })
    : [];
  const visiblePeople = people.filter((u) => !blocked.has(u.id));
  const friendships = submitted
    ? await prisma.friendship.findMany({
        where: { OR: [{ fromId: me.id }, { toId: me.id }] },
      })
    : [];

  const userIds = visiblePeople.map((u) => u.id);
  const meetupsByUser = new Map<string, { subject: string; topic: string; meetDate: string; style: string }[]>();
  if (submitted && userIds.length) {
    const hosted = await prisma.meeting.findMany({
      where: { hostId: { in: userIds }, isPrivate: false },
      select: { hostId: true, subject: true, topic: true, meetDate: true, style: true },
    });
    const joined = await prisma.member.findMany({
      where: { userId: { in: userIds }, meeting: { isPrivate: false } },
      include: {
        meeting: { select: { subject: true, topic: true, meetDate: true, style: true } },
      },
    });
    for (const m of hosted) {
      const list = meetupsByUser.get(m.hostId) || [];
      list.push(m);
      meetupsByUser.set(m.hostId, list);
    }
    for (const mem of joined) {
      const list = meetupsByUser.get(mem.userId) || [];
      list.push(mem.meeting);
      meetupsByUser.set(mem.userId, list);
    }
  }

  const ranked = visiblePeople
    .map((user) => {
      const { score, reasons } = buddyMatch(prefs, user, meetupsByUser.get(user.id) || []);
      const bond = friendships.find(
        (f) => (f.fromId === me.id && f.toId === user.id) || (f.fromId === user.id && f.toId === me.id),
      );
      return { user, score, reasons, bond };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const pick = ranked[0];
  const examBits = [
    prefs.examCourse ? prefs.examCourse : "",
    prefs.examDate ? formatMeetDate(prefs.examDate) : "",
    prefs.studyStyle ? prefs.studyStyle : "",
  ].filter(Boolean);

  let matchingGroups: {
    id: string;
    subject: string;
    topic: string;
    meetDate: string;
    time: string;
    location: string;
    style: string;
    groupKind: string;
    members: { length: number };
    maxSize: number;
    score: number;
  }[] = [];

  if (submitted && (prefs.examCourse || prefs.examTopics || prefs.studyStyle)) {
    const publicMeetings = await prisma.meeting.findMany({
      where: { isPrivate: false },
      include: { _count: { select: { members: true } } },
    });
    matchingGroups = publicMeetings
      .map((m) => ({
        id: m.id,
        subject: m.subject,
        topic: m.topic,
        meetDate: m.meetDate,
        time: m.time,
        location: m.location,
        style: m.style,
        groupKind: m.groupKind,
        members: { length: m._count.members },
        maxSize: m.maxSize,
        score: examMeetupScore(prefs, m),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  return (
    <div className="page motion-page-enter" style={{ maxWidth: 680 }}>
      <header className="page-header">
        <Link href="/find" className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
          ← Find Buddies
        </Link>
        <h1 className="page-title">Find Your Buddies</h1>
        <p>
          Match with classmates prepping for the same exam — we use your profile, exam subject &amp; topics, and
          study groups you both fit.
        </p>
      </header>

      {submitted && pick ? (
        <MatchNotify
          name={`${pick.user.firstName} ${pick.user.lastName}`}
          detail={
            pick.reasons.length
              ? `Matched for exam prep — ${pick.reasons.slice(0, 4).join(", ")}.`
              : ""
          }
        />
      ) : null}

      <form method="get" className="box" style={{ marginBottom: 28 }}>
        <h3 className="form-section-title">Exam prep</h3>
        <ExamPrepFields
          defaultCourse={prefs.examCourse}
          defaultDate={prefs.examDate}
          defaultTopics={splitList(prefs.examTopics)}
          defaultStyle={prefs.studyStyle}
          showYearFilter
          defaultYear={prefs.year}
        />

        <h3 className="form-section-title">Campus &amp; major</h3>
        <UniversityPicker defaultValue={prefs.university} required={false} />
        <MajorPicker defaultValue={prefs.major} required={false} />

        <p className="text-muted buddies-profile-hint" style={{ fontSize: 14, margin: "0 0 16px" }}>
          {profileCanHelp.length ? (
            <>
              Matching also uses classes you can help with from your profile:{" "}
              <strong>{profileCanHelp.join(", ")}</strong>.{" "}
              <Link href={`/profile/${me.id}?edit=1`}>Edit profile</Link>
            </>
          ) : (
            <>
              Add classes you can help with on{" "}
              <Link href={`/profile/${me.id}?edit=1`}>your profile</Link> so we can match you with students who
              need a tutor.
            </>
          )}
        </p>

        <button className="btn" type="submit">
          Find Your Buddies
        </button>
      </form>

      {submitted && examBits.length ? (
        <p className="text-muted" style={{ marginTop: -16, marginBottom: 20, fontSize: 14 }}>
          Searching for: {examBits.join(" · ")}
          {splitList(prefs.examTopics).length ? ` · ${splitList(prefs.examTopics).join(", ")}` : ""}
        </p>
      ) : null}

      {submitted && matchingGroups.length ? (
        <section style={{ marginBottom: 28 }}>
          <h2 className="section-title">Study groups for your exam</h2>
          <p className="text-muted" style={{ marginTop: -8, marginBottom: 12, fontSize: 14 }}>
            Public groups matching your subject, topics, or study style.
          </p>
          <div className="found-list">
            {matchingGroups.map((g, i) => {
              const topic = g.topic.split(",")[0]?.trim();
              return (
                <div
                  key={g.id}
                  className="card found-mini motion-stagger-item"
                  style={{ ["--motion-delay" as string]: `${i * 40}ms` }}
                >
                  <Link href={`/meetings/${g.id}`} className="found-mini-main">
                    <span className="avatar group-avatar">{g.subject.slice(0, 2).toUpperCase()}</span>
                    <span className="found-mini-text">
                      <b>
                        {g.subject}
                        {topic ? ` — ${topic}` : ""}
                      </b>
                      <span className="found-mini-meta">
                        {[formatMeetDate(g.meetDate), g.time, g.location].filter(Boolean).join(" · ")}
                      </span>
                      <span className="found-mini-meta">
                        {groupKindLabel(g.groupKind)} · {g.style} · {g.members.length}/{g.maxSize}
                      </span>
                    </span>
                  </Link>
                  <Link className="btn" href={`/meetings/${g.id}`}>
                    View
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {submitted ? (
        !pick ? (
          <div className="card">
            Nobody lined up with those preferences yet. Try widening your subject or campus, add exam topics, or{" "}
            <Link href="/find/browse">browse exam review meetups</Link>.
          </div>
        ) : (
          <section>
            <h2 className="section-title">Buddy matches</h2>
            <div className="found-list">
              {ranked.slice(0, 12).map(({ user, reasons, bond }, i) => {
                const bits = [user.year, user.major, user.university].filter(Boolean);
                const examMeta = [
                  user.examCourse ? `${user.examCourse} exam` : "",
                  user.examDate ? formatMeetDate(user.examDate) : "",
                ].filter(Boolean);
                const canHelp = splitList(user.canHelp);
                return (
                  <div
                    key={user.id}
                    className="card found-mini motion-stagger-item"
                    style={{ justifyContent: "space-between", ["--motion-delay" as string]: `${i * 45}ms` }}
                  >
                    <Link href={`/profile/${user.id}`} className="found-mini-main">
                      <Avatar user={user} />
                      <span className="found-mini-text">
                        <b>
                          {user.firstName} {user.lastName}
                        </b>
                        {bits.length ? <span className="found-mini-meta">{bits.join(" · ")}</span> : null}
                        {canHelp.length ? (
                          <span className="found-mini-meta">Can help: {canHelp.slice(0, 3).join(", ")}</span>
                        ) : null}
                        {examMeta.length ? (
                          <span className="found-mini-meta">Prepping: {examMeta.join(" · ")}</span>
                        ) : null}
                        {reasons.length ? (
                          <span className="found-mini-why">{reasons.slice(0, 4).join(" · ")}</span>
                        ) : null}
                      </span>
                    </Link>
                    {bond?.status === "accepted" ? (
                      <Link className="pill active" href={`/friends/${user.id}`}>
                        Message
                      </Link>
                    ) : bond?.status === "pending" && bond.toId === me.id ? (
                      <form action={acceptFriend}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="next" value={stay} />
                        <button className="btn" type="submit">
                          Accept
                        </button>
                      </form>
                    ) : bond?.status === "pending" ? (
                      <span className="pill">Sent</span>
                    ) : (
                      <form action={addFriend}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="next" value={stay} />
                        <button className="btn" type="submit">
                          Add buddy
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )
      ) : null}
    </div>
  );
}
