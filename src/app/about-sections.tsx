"use client";

import Link from "next/link";
import { ScrollReveal } from "./scroll-reveal";
import {
  BookIcon,
  ChatIcon,
  FilterIcon,
  MatchIcon,
  PeopleIcon,
  PreviewIcon,
  SparkIcon,
} from "./about-icons";

const features = [
  {
    icon: <FilterIcon />,
    title: "Same course. Same grind.",
    body: "Filter by the class you're actually in and land with buddies preparing for the same exam, not a random hangout.",
  },
  {
    icon: <PreviewIcon />,
    title: "Know before you go",
    body: "See who's joining, group size, meeting spot, and what you'll cover, all before you commit.",
  },
  {
    icon: <MatchIcon />,
    title: "Give & get help",
    body: "List what you're stuck on and what you can teach. We match you with buddies who actually fit.",
  },
  {
    icon: <SparkIcon />,
    title: "Zero noise",
    body: "No infinite scroll, no algorithm feed. Just study buddy groups, profiles, and group chat to stay aligned.",
  },
];

const reasons = [
  {
    icon: <BookIcon />,
    title: "Prepare for exams",
    body: "Find buddies preparing for the same midterm or final and review topics together before test day.",
  },
  {
    icon: <PeopleIcon />,
    title: "Find your buddies",
    body: "See who’s going, check profiles for classes they can help with, and join a group that fits you.",
  },
  {
    icon: <ChatIcon />,
    title: "Stay coordinated",
    body: "Use group chat to lock a time, share location updates, and keep everyone on the same page.",
  },
];

export function AboutSections({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="about-sections">
      <ScrollReveal>
        <section className="section about-panel">
          <h2 className="section-title">About Us</h2>
          <p className="lead">
            We built <span className="brand-name">StudyBuddyBoard</span> so you don&apos;t have to cram by yourself. Post
            a study buddy group, jump into one for your class, see who&apos;s going, and keep group chat in one place. No more
            hunting through random group chats and flyers.
          </p>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={60}>
        <section className="section about-panel">
          <h2 className="section-title">Built for Real Study Sessions</h2>
          <p className="lead feature-lead">
            Everything you need to find the right buddies, without the clutter of a social network.
          </p>
          <div className="feature-grid">
            {features.map((item, i) => (
              <ScrollReveal key={item.title} direction="scale" delay={i * 80} className="about-reveal-card">
                <article className="feature-card">
                  <div className="feature-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={60}>
        <section className="section about-panel">
          <h2 className="section-title">Three Things We Help With</h2>
          <div className="reason-row">
            {reasons.map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 90} className="about-reveal-card">
                <article className="reason-card">
                  <div className="reason-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal direction="scale" delay={80}>
        <section className="section cta-band about-panel">
          <h2 className="section-title" style={{ marginTop: 0 }}>
            Ready to Find a Study Buddy?
          </h2>
          <p style={{ marginBottom: 16 }}>
            Make an account with your school email and jump into a study buddy group for your next exam.
          </p>
          <Link className="btn-accent" href={loggedIn ? "/dashboard" : "/signup"}>
            {loggedIn ? "Open Buddy Board" : "Create an Account"}
          </Link>
        </section>
      </ScrollReveal>
    </div>
  );
}
