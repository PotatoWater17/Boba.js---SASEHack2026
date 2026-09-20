import { buddyMatchReasonLabel } from "@/buddy-match-display";

const PREVIEW_COUNT = 3;

export function MatchReasons({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;

  const labels = reasons.map(buddyMatchReasonLabel);
  const preview = labels.slice(0, PREVIEW_COUNT);
  const extra = labels.slice(PREVIEW_COUNT);

  return (
    <div className="match-reasons">
      <p className="match-reasons-heading">Why you match</p>
      <ul className="match-reasons-list">
        {preview.map((label, i) => (
          <li key={`${i}-${label}`}>{label}</li>
        ))}
      </ul>
      {extra.length ? (
        <details className="match-reasons-more">
          <summary>Show {extra.length} more reason{extra.length === 1 ? "" : "s"}</summary>
          <ul className="match-reasons-list">
            {extra.map((label, i) => (
              <li key={`${i + PREVIEW_COUNT}-${label}`}>{label}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
