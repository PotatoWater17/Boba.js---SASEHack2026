import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, PAGE_SIZE } from "@/lib";

export default async function FindPage() {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Find study buddies</h1>
        <p>
          Groups are sorted by your profile preferences first (classes you need help in / can help with),
          then we show {PAGE_SIZE} at a time. Browse starts at your university.{" "}
          <Link href="/find/buddies" style={{ textDecoration: "underline" }}>
            Match with a person
          </Link>
        </p>
      </header>

      <div className="find-hub">
        <Link className="btn find-hub-btn" href="/find/browse">
          Browse meetups
        </Link>
        <Link className="btn find-hub-btn" href="/find/create">
          Create a meetup
        </Link>
        <Link className="btn-accent find-hub-btn" href="/find/buddies">
          Find your buddies
        </Link>
      </div>
    </div>
  );
}
