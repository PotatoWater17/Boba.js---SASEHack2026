/** US colleges from IPEDS 2023 directory. Custom names allowed when not listed. */
import { UNIVERSITIES } from "@/universities.data";

export { UNIVERSITIES };

export function searchUniversities(query: string, limit = 30) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: string[] = [];
  for (const name of UNIVERSITIES) {
    if (name.toLowerCase().includes(q)) {
      out.push(name);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export function resolveUniversity(raw: string) {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (cleaned.length < 3 || cleaned.length > 120) return "";
  const hit = UNIVERSITIES.find((u) => u.toLowerCase() === cleaned.toLowerCase());
  return hit || cleaned;
}
