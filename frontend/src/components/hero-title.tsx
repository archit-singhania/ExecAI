const WORD_STYLES = [
  "title-muted", 
  "", 
  "title-accent",
  "",
] as const;

export function HeroTitle() {
  const words = ["Autonomous", "executive", "command", "center"];

  return (
    <h1
      className="min-w-0 font-black leading-tight tracking-tight"
      style={{ fontSize: "clamp(1.05rem, 0.85rem + 1.1vw, 2.75rem)" }}
    >
      {words.map((word, index) => (
        <span key={word} className={WORD_STYLES[index] || undefined}>
          {word}
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </h1>
  );
}
