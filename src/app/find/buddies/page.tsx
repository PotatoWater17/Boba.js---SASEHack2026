import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptFriend, addFriend } from "@/app/actions";
import { MatchNotify } from "./notify";
import { ClassBubbles, ExamPrepFields, MajorPicker, UniversityPicker } from "@/ui";
import { Avatar } from "@/avatar";
import { blockedUserIds, buddyMatch, formatMeetDate, getMe, prisma, splitList } from "@/lib";

export default async function FindBuddiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    needHelp?: string;
    canHelp?: string;
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
    "needHelp" in q ||
    "canHelp" in q ||
    "university" in q ||
    "major" in q ||
    "examCourse" in q ||
    "examDate" in q ||
    "examTopics" in q ||
    "studyStyle" in q ||
    "year" in q;

  const prefs = {
    needHelp: submitted ? String(q.needHelp || "") : me.needHelp,
    canHelp: submitted ? String(q.canHelp || "") : me.canHelp,
    university: submitted ? String(q.university || "") : me.university,
    major: submitted ? String(q.major || "") : me.major,
    examCourse: submitted ? String(q.examCourse || "") : me.examCourse,
    examDate: submitted ? String(q.examDate || "") : me.examDate,
    examTopics: submitted ? String(q.examTopics || "") : me.examTopics,
    studyStyle: submitted ? String(q.studyStyle || "") : me.studyStyle,
    year: submitted ? String(q.year || "") : "",
  };

  const stayParams = new URLSearchParams();
  stayParams.set("needHelp", prefs.needHelp);
  stayParams.set("canHelp", prefs.canHelp);
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

  return (
    <div className="page motion-page-enter" style={{ maxWidth: 680 }}>
      <header className="page-header">
        <Link href="/find" className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
          ← Find Buddies
        </Link>
        <h1 className="page-title">Find Your Buddies</h1>
        <p>
          Match with classmates who can help you prep for upcoming exams — same course, topics, campus, and study
          style.
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
        <h3 className="form-section-title">Classes</h3>
        <ClassBubbles label="Classes I need help in" name="needHelp" initial={splitList(prefs.needHelp)} />
        <ClassBubbles label="Classes I can help with" name="canHelp" initial={splitList(prefs.canHelp)} />

        <h3 className="form-section-title">Exam prep</h3>
        <ExamPrepFields
          defaultCourse={prefs.examCourse}
          defaultDate={prefs.examDate}
          defaultTopics={splitList(prefs.examTopics)}
          defaultStyle={prefs.studyStyle}
          showYearFilter
          defaultYear={prefs.year}
        />

        <h3 className="form-section-title">Campus & major</h3>
        <UniversityPicker defaultValue={prefs.university} required={false} />
        <MajorPicker defaultValue={prefs.major} required={false} />

        <button className="btn" type="submit">
          Find exam prep buddies
        </button>
      </form>

      {submitted && examBits.length ? (
        <p className="text-muted" style={{ marginTop: -16, marginBottom: 20, fontSize: 14 }}>
          Searching for: {examBits.join(" · ")}
          {splitList(prefs.examTopics).length ? ` · ${splitList(prefs.examTopics).join(", ")}` : ""}
        </p>
      ) : null}

      {submitted ? (
        !pick ? (
          <div className="card">
            Nobody lined up with those preferences yet. Try widening your course or campus, add exam topics, or{" "}
            <Link href="/find/browse">browse exam review meetups</Link>.
          </div>
        ) : (
          <section>
            <h2 className="section-title">Matches</h2>
            <div className="found-list">
              {ranked.slice(0, 12).map(({ user, reasons, bond }, i) => {
                const bits = [user.year, user.major, user.university].filter(Boolean);
                const examMeta = [
                  user.examCourse ? `${user.examCourse} exam` : "",
                  user.examDate ? formatMeetDate(user.examDate) : "",
                ].filter(Boolean);
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
