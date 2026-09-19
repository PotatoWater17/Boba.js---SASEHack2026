import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, PAGE_SIZE } from "@/lib";

export default async function FindPage() {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <div className="page">
      <header className="page-header" style={{ textAlign: "center" }}>
        <h1 className="page-title">Find Study Buddies</h1>
        <p>
          Groups are sorted by your profile preferences first (classes you need help in / can help with),
          then we show {PAGE_SIZE} at a time. Browse starts at your university.{" "}
          <Link href="/find/buddies" style={{ textDecoration: "underline" }}>
            Match with a person
          </Link>
        </p>
      </header>

      <div className="find-hub">
        <Link className="btn-accent find-hub-btn" href="/find/buddies">
          <b>Find Your Buddies</b>
          <span>Enter your classes and we&apos;ll match you with people.</span>
        </Link>
        <Link className="btn find-hub-btn" href="/find/browse">
          <b>Browse Meetups</b>
          <span>See study groups already posted on campus.</span>
        </Link>
        <Link className="btn find-hub-btn" href="/find/create">
          <b>Create a Meetup</b>
          <span>Post a time, place, and topic for classmates to join.</span>
        </Link>
      </div>
    </div>
  );
}
