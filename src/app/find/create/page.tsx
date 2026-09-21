import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateMeetupForm } from "@/ui";
import { getMe } from "@/lib";

export default async function CreateMeetupPage() {
  const me = await getMe();
  if (!me) redirect("/login");

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <header className="page-header">
        <Link href="/find" className="pill" style={{ marginBottom: 10, display: "inline-block" }}>
          ← Find Buddies
        </Link>
        <h1 className="page-title">Create a Study Buddy Group</h1>
        <p>Post a study session so classmates can jump in.</p>
      </header>
      <CreateMeetupForm />
    </div>
  );
}
