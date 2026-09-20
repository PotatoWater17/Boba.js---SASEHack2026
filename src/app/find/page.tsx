import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib";

export default async function FindPage() {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <div className="page find-page motion-page-enter">
      <header className="page-header">
        <h1 className="page-title">Find Buddies</h1>
        <p>Browse study buddy groups or match with a buddy for exam prep.</p>
      </header>

      <div className="find-hub">
        <Link
          className="btn-accent find-hub-btn hover-lift motion-stagger-item"
          href="/find/buddies"
          style={{ ["--motion-delay" as string]: "0ms" }}
        >
          <b>Find Your Buddies</b>
          <span>Tell us your exam subject and topics. We&apos;ll match buddies and study groups from your profile.</span>
        </Link>
        <Link
          className="btn find-hub-btn hover-lift motion-stagger-item"
          href="/find/browse"
          style={{ ["--motion-delay" as string]: "45ms" }}
        >
          <b>Browse Study Buddy Groups</b>
          <span>See groups already posted on campus.</span>
        </Link>
        <Link
          className="btn find-hub-btn hover-lift motion-stagger-item"
          href="/find/create"
          style={{ ["--motion-delay" as string]: "90ms" }}
        >
          <b>Create a Study Buddy Group</b>
          <span>Post a time, place, and topic for classmates to join.</span>
        </Link>
      </div>
    </div>
  );
}
