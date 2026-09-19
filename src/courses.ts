import { SUBJECT_TOPICS } from "@/courses.data";

export { SUBJECT_TOPICS };

/** Fallback topic suggestions when the subject is custom or not in the catalog. */
export const DEFAULT_TOPICS = [
  "Exam review",
  "Final exam review",
  "Homework help",
  "Practice problems",
  "Concept review",
  "Project help",
  "Lab prep",
  "Discussion",
  "Midterm review",
  "Quiz prep",
] as const;

export const COURSES = Object.keys(SUBJECT_TOPICS);

export function searchCourses(query: string, limit = 40) {
  const q = query.trim().toLowerCase();
  if (!q) return COURSES.slice(0, limit);
  const out: string[] = [];
  for (const name of COURSES) {
    if (name.toLowerCase().includes(q)) {
      out.push(name);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Accept catalog courses or a custom name (2–80 chars). */
export function resolveCourse(raw: string) {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 80) return "";
  const hit = COURSES.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  return hit || cleaned;
}

export const LOCATIONS = [
  "Student Center",
  "Library",
  "Library 2nd floor",
  "Science hall",
  "Math building",
  "Engineering building",
  "Chemistry building",
  "CS lab",
  "Writing center",
  "Online (Zoom)",
  "Online (Teams)",
  "Coffee shop near campus",
];

/** Partner = 1:1 (2 people). Small = 3–7. Big = 8+. */
export const GROUP_KINDS = [
  { id: "partner", label: "Partner (1:1)", min: 2, max: 2, defaultSize: 2 },
  { id: "small", label: "Small group (3–7)", min: 3, max: 7, defaultSize: 5 },
  { id: "big", label: "Big group (8+)", min: 8, max: 20, defaultSize: 12 },
] as const;

export type GroupKindId = (typeof GROUP_KINDS)[number]["id"];

export const MEETUP_STYLES = [
  "Practice problems",
  "Lecture / teach-back",
  "Exam review",
  "Homework help",
  "Concept review",
  "Lab prep",
  "Discussion",
  "Mixed",
] as const;

export function topicsFor(subject: string) {
  const cleaned = subject.trim();
  if (!cleaned) return [...DEFAULT_TOPICS];
  if (SUBJECT_TOPICS[cleaned]) return SUBJECT_TOPICS[cleaned];
  const hit = COURSES.find((c) => c.toLowerCase() === cleaned.toLowerCase());
  if (hit) return SUBJECT_TOPICS[hit];
  return [...DEFAULT_TOPICS];
}

export function groupKindById(id: string) {
  return GROUP_KINDS.find((k) => k.id === id);
}

export function groupKindLabel(id: string) {
  return groupKindById(id)?.label ?? "Small group (3–7)";
}

export function groupKindFromMaxSize(maxSize: number): GroupKindId {
  if (maxSize <= 2) return "partner";
  if (maxSize <= 7) return "small";
  return "big";
}
