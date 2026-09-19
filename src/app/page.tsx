import Image from "next/image";
import Link from "next/link";
import { getMe } from "@/lib";

function BookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M4 19.2h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 18.5c.8-2.8 2.8-4.2 5.5-4.2s4.7 1.4 5.5 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 14.5c1.4-.6 2.8-.5 4.2.4 1.2.8 1.9 2 2.2 3.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H10l-4 3.2V16H7.5A2.5 2.5 0 0 1 5 13.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 9h7M8.5 12h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const reasons = [
  {
    icon: <BookIcon />,
    title: "Prepare for exams",
    body: "Find classmates taking the same midterm or final and review topics together before test day.",
  },
  {
    icon: <PeopleIcon />,
    title: "Find your people",
    body: "See who’s going, check profiles for classes they can help with, and join a group that fits you.",
  },
  {
    icon: <ChatIcon />,
    title: "Stay coordinated",
    body: "Use the group chat to lock a time, share location updates, and keep everyone on the same page.",
  },
];

export default async function IntroPage() {
  const me = await getMe();

  return (
    <div className="about-page">
      <div className="about-bg" aria-hidden="true">
        <Image
          src="/desk-lamp-notebook-arrangement.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="about-bg-img"
        />
        <div className="about-bg-shade" />
      </div>

      <div className="page about-content">
      <div className="hero about-hero">
        <Image
          src="/teddy-bear-face.jpg"
          alt="StudyBuddyBoard teddy mascot"
          width={440}
          height={440}
          className="hero-img"
          priority
        />
        <div>
          <p className="eyebrow">Built for college students</p>
          <div className="brand-lockup">
            <h1 className="page-title brand-name">StudyBuddyBoard</h1>
            <p className="tagline">Fuel The Grind</p>
          </div>
          <p style={{ fontSize: 18, maxWidth: 520, marginTop: 24 }}>
            Stop cramming alone before exams. <span className="brand-name">StudyBuddyBoard</span> helps you find students like you who
            are also looking to prepare, plan out the study group, and stay connected!
          </p>
          <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="btn-accent" href={me ? "/dashboard" : "/login"}>
              {me ? "Go to dashboard" : "Get started"}
            </Link>
            {!me ? (
              <Link className="btn" href="/login">
                Login / Sign Up
              </Link>
            ) : (
              <Link className="btn" href="/find">
                Find Buddies
              </Link>
            )}
          </div>
        </div>
      </div>

      <section className="section about-panel">
        <h2 className="section-title">About Us</h2>
        <p className="lead">
          We built <span className="brand-name">StudyBuddyBoard</span> so you don&apos;t have to cram by yourself. Post a meetup, jump into
          one for your class, see who&apos;s going, and keep the group chat in one place — no more
          hunting through random group chats and flyers.
        </p>
      </section>

      <section className="section about-panel">
        <h2 className="section-title">
          Why <span className="brand-name">StudyBuddyBoard</span>?
        </h2>
        <ul className="why-list">
          <li>
            <b>Your class, your people.</b> Filter by the course you&apos;re actually taking so you
            land with classmates, not a random hangout.
          </li>
          <li>
            <b>No surprises.</b> Check who&apos;s going, how big the group is, where you&apos;re meeting,
            and what you&apos;ll cover before you join.
          </li>
          <li>
            <b>Help each other out.</b> Put down what you need help with and what you can teach so
            it&apos;s easy to find a good study fit.
          </li>
          <li>
            <b>Kept it simple.</b> No noisy feed — just meetups, people, and a chat to stay on the
            same page.
          </li>
        </ul>
      </section>

      <section className="section about-panel">
        <h2 className="section-title">Three things we help with</h2>
        <div className="reason-row">
          {reasons.map((item) => (
            <article key={item.title} className="reason-card">
              <div className="reason-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section cta-band about-panel">
        <h2 className="section-title" style={{ marginTop: 0 }}>
          Ready to find a study buddy?
        </h2>
        <p style={{ marginBottom: 16 }}>
          Make an account with your school email and jump into a meetup for your next exam.
        </p>
        <Link className="btn-accent" href={me ? "/dashboard" : "/login"}>
          {me ? "Open dashboard" : "Create an account"}
        </Link>
      </section>
      </div>
    </div>
  );
}
