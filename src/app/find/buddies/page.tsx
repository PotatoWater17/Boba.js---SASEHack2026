import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptFriend, addFriend } from "@/app/actions";
import { MatchNotify } from "./notify";
import { ClassBubbles, MajorPicker, UniversityPicker } from "@/ui";
import { Avatar } from "@/avatar";
import { buddyMatch, getMe, prisma, splitList } from "@/lib";

export default async function FindBuddiesPage({
  searchParams,
}: {
  searchParams: Promise<{ needHelp?: string; canHelp?: string; university?: string; major?: string }>;
}) {
  const me = await getMe();
  if (!me) redirect("/login");

  const q = await searchParams;
  const submitted = "needHelp" in q || "canHelp" in q || "university" in q || "major" in q;
  const prefs = {
    needHelp: submitted ? String(q.needHelp || "") : me.needHelp,
    canHelp: submitted ? String(q.canHelp || "") : me.canHelp,
    university: submitted ? String(q.university || "") : me.university,
    major: submitted ? String(q.major || "") : me.major,
  };

  const stayParams = new URLSearchParams();
  stayParams.set("needHelp", prefs.needHelp);
  stayParams.set("canHelp", prefs.canHelp);
  stayParams.set("university", prefs.university);
  stayParams.set("major", prefs.major);
  const stay = `/find/buddies?${stayParams.toString()}`;

  const people = submitted
    ? await prisma.user.findMany({
        where: { id: { not: me.id } },
        orderBy: { firstName: "asc" },
      })
    : [];
  const friendships = submitted
    ? await prisma.friendship.findMany({
        where: { OR: [{ fromId: me.id }, { toId: me.id }] },
      })
    : [];

  const ranked = people
    .map((user) => {
      const { score, reasons } = buddyMatch(prefs, user);
      const bond = friendships.find(
        (f) => (f.fromId === me.id && f.toId === user.id) || (f.fromId === user.id && f.toId === me.id),
      );
      return { user, score, reasons, bond };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const pick = ranked[0];

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <header className="page-header">
        <Link href="/find" className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
          ← Find Buddies
        </Link>
        <h1 className="page-title">Find Your Buddies</h1>
        <p>Tell us what you&apos;re grinding on and we&apos;ll match you with people who line up.</p>
      </header>

      {submitted && pick ? (
        <MatchNotify
          name={`${pick.user.firstName} ${pick.user.lastName}`}
          detail={
            pick.reasons.length
              ? `Matched from your preferences — ${pick.reasons.slice(0, 3).join(", ")}.`
              : ""
          }
        />
      ) : null}

      <form method="get" className="box" style={{ marginBottom: 28 }}>
        <ClassBubbles label="Classes I need help in" name="needHelp" initial={splitList(prefs.needHelp)} />
        <ClassBubbles label="Classes I can help with" name="canHelp" initial={splitList(prefs.canHelp)} />
        <UniversityPicker defaultValue={prefs.university} required={false} />
        <MajorPicker defaultValue={prefs.major} required={false} />
        <button className="btn" type="submit">
          Find matches
        </button>
      </form>

      {submitted ? (
        !pick ? (
          <div className="card">
            Nobody lined up with those preferences yet. Try another class or campus, or{" "}
            <Link href="/find/browse">browse meetups</Link>.
          </div>
        ) : (
          <section>
            <h2 className="section-title">Matches</h2>
            <div className="found-list">
              {ranked.slice(0, 12).map(({ user, reasons, bond }) => {
                const bits = [user.year, user.major, user.university].filter(Boolean);
                return (
                  <div key={user.id} className="card found-mini" style={{ justifyContent: "space-between" }}>
                    <Link href={`/profile/${user.id}`} className="found-mini-main">
                      <Avatar user={user} />
                      <span className="found-mini-text">
                        <b>
                          {user.firstName} {user.lastName}
                        </b>
                        {bits.length ? <span className="found-mini-meta">{bits.join(" · ")}</span> : null}
                        {reasons.length ? (
                          <span className="found-mini-why">{reasons.slice(0, 3).join(" · ")}</span>
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
