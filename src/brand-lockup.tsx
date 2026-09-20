type BrandLockupProps = {
  size?: "sm" | "md" | "lg";
  /** Use h1 on the about hero for SEO; default is span. */
  titleAs?: "h1" | "span";
  className?: string;
};

export function BrandLockup({ size = "sm", titleAs = "span", className = "" }: BrandLockupProps) {
  const Title = titleAs;
  const taglineAs = titleAs === "h1" ? "p" : "span";

  return (
    <div className={`brand-lockup brand-lockup-${size}${className ? ` ${className}` : ""}`}>
      <Title className="brand-title">StudyBuddyBoard</Title>
      {taglineAs === "p" ? (
        <p className="tagline">Fuel The Grind</p>
      ) : (
        <span className="tagline">Fuel The Grind</span>
      )}
    </div>
  );
}
