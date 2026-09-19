export const YEAR_OPTIONS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Grad Student",
] as const;

export type YearOption = (typeof YEAR_OPTIONS)[number];

export function isYearOption(value: string): value is YearOption {
  return (YEAR_OPTIONS as readonly string[]).includes(value);
}
