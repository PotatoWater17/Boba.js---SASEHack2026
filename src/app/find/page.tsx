import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib";

export default async function FindPage() {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <div className="page motion-page-enter">
      <header className="page-header" style={{ textAlign: "center" }}>
        <h1 className="page-title">Find Study Buddies</h1>
        <p>Browse study groups or find a buddy for exam prep.</p>
      </header>

      <div className="find-hub">
        <Link
          className="btn-accent find-hub-btn motion-stagger-item"
          href="/find/buddies"
          style={{ ["--motion-delay" as string]: "0ms" }}
        >
          <b>Find Your Buddies</b>
          <span>Tell us your exam subject and topics — we&apos;ll match buddies and study groups from your profile.</span>
        </Link>
        <Link
          className="btn find-hub-btn motion-stagger-item"
          href="/find/browse"
          style={{ ["--motion-delay" as string]: "45ms" }}
        >
          <b>Browse Meetups</b>
          <span>See study groups already posted on campus.</span>
        </Link>
        <Link
          className="btn find-hub-btn motion-stagger-item"
          href="/find/create"
          style={{ ["--motion-delay" as string]: "90ms" }}
        >
          <b>Create a Meetup</b>
          <span>Post a time, place, and topic for classmates to join.</span>
        </Link>
      </div>
    </div>
  );
}
