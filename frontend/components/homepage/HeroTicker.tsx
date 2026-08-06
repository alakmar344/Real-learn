import { Fragment } from "react";

// Kinetic ticker — the moving line of the Olive Frenzy hero. Decorative
// (aria-hidden); pauses on hover, static under reduced-motion / low perf.
const SEQUENCE: Array<{ text: string; script?: boolean }> = [
  { text: "ask anything", script: true },
  { text: "3-part lessons" },
  { text: "quiz to unlock", script: true },
  { text: "12 languages" },
  { text: "level up", script: true },
  { text: "live news grounding" },
  { text: "streaks + xp" },
];

function Track() {
  return (
    <div className="hero-ticker__track">
      {SEQUENCE.map((item, i) => (
        <Fragment key={i}>
          <span
            className={
              item.script
                ? "hero-ticker__word hero-ticker__word--script"
                : "hero-ticker__word"
            }
          >
            {item.text}
          </span>
          <span className="hero-ticker__tick" />
        </Fragment>
      ))}
    </div>
  );
}

export default function HeroTicker() {
  return (
    <div className="hero-ticker" aria-hidden="true">
      <Track />
      <Track />
    </div>
  );
}
