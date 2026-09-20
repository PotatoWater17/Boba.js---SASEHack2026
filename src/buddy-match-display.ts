/** Short label for ranked buddy results. */
export function buddyMatchLabel(score: number, rank: number, topScore: number) {
  if (rank === 0) return "Best match";
  if (topScore > 0 && score >= topScore * 0.75) return "Strong match";
  if (topScore > 0 && score >= topScore * 0.5) return "Good match";
  return "Possible match";
}

/** User-facing label for a buddy match reason. */
export function buddyMatchReasonLabel(reason: string) {
  const r = reason.trim();
  const lower = r.toLowerCase();

  if (lower.startsWith("can help with ")) return `Can help you with ${r.slice(14)}`;
  if (lower.startsWith("needs help in ")) return `You can help them with ${r.slice(14)}`;
  if (lower.startsWith("also grinding ")) return `Also studying ${r.slice(14)}`;
  if (lower.startsWith("can tutor ")) return `Can tutor you in ${r.slice(10)}`;
  if (lower.startsWith("same exam: ")) return `Same exam prep: ${r.slice(11)}`;
  if (lower.startsWith("also prepping ")) return `Also prepping for ${r.slice(14)}`;
  if (lower.startsWith("in ") && lower.endsWith(" study group")) {
    return `In a ${r.slice(3, -13)} study group`;
  }
  if (/^\d+ shared exam topics?$/.test(lower)) {
    return r.charAt(0).toUpperCase() + r.slice(1);
  }
  if (lower.startsWith("prefers ")) {
    const style = r.slice(8);
    return `Same study style: ${style.charAt(0).toUpperCase()}${style.slice(1)}`;
  }
  if (lower.startsWith("group uses ")) {
    return `Study group uses your style (${r.slice(11)})`;
  }

  const labels: Record<string, string> = {
    "covers your weak topics": "Their profile covers your weak topics",
    "exam same week": "Exam the same week as yours",
    "exam dates close": "Exam dates within a week of yours",
    "exam dates nearby": "Exam dates within two weeks of yours",
    "prepping for your exam window": "Prepping around your exam date",
    "group covers your topics": "In a study group that covers your topics",
    "group meets before your exam": "Study group meets before your exam",
    "same campus": "Same campus",
    "same major": "Same major",
    "on your campus": "On your campus",
  };

  return labels[lower] || r.charAt(0).toUpperCase() + r.slice(1);
}
