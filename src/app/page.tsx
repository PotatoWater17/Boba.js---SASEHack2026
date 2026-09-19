import Image from "next/image";
import Link from "next/link";
import { AboutSections } from "./about-sections";
import { getMe } from "@/lib";

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

      <div className="about-hero-stage motion-hero-stage">
        <div className="page about-hero-wrap">
          <div className="hero about-hero">
            <Image
              src="/teddy-bear-face.jpg"
              alt="StudyBuddyBoard teddy mascot"
              width={440}
              height={440}
              className="hero-img motion-hero-item motion-hero-d1"
              priority
            />
            <div>
              <p className="eyebrow motion-hero-item motion-hero-d2">Built for college students</p>
              <div className="brand-lockup motion-hero-item motion-hero-d3">
                <h1 className="page-title brand-name">StudyBuddyBoard</h1>
                <p className="tagline">Fuel The Grind</p>
              </div>
              <p className="about-hero-copy motion-hero-item motion-hero-d4">
                Stop cramming alone before exams. <span className="brand-name">StudyBuddyBoard</span> helps you find
                students like you who are also looking to prepare, plan out the study group, and stay connected!
              </p>
              <div className="about-hero-actions motion-hero-item motion-hero-d5">
                <Link className="btn-accent" href={me ? "/dashboard" : "/signup"}>
                  {me ? "Go to dashboard" : "Get started"}
                </Link>
                {!me ? (
                  <Link className="btn" href="/login">
                    Log in
                  </Link>
                ) : (
                  <Link className="btn" href="/find">
                    Find Buddies
                  </Link>
                )}
              </div>
            </div>
          </div>
          <p className="about-scroll-hint motion-hero-item" aria-hidden="true">
            Scroll to explore ↓
          </p>
        </div>
      </div>

      <AboutSections loggedIn={!!me} />
    </div>
  );
}
