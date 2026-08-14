import { Fragment } from "react";

// Kinetic ticker — the moving line of the Olive Frenzy hero. Decorative
// (aria-hidden); pauses on hover, static under reduced-motion / low perf.
const SEQUENCE: Array<{ text: string; script?: boolean }> = [
  { text: "master concepts", script: true },
  { text: "3-step clarity" },
  { text: "active recall", script: true },
  { text: "12 languages" },
  { text: "curriculum aligned", script: true },
  { text: "live fact grounding" },
  { text: "zero ads & private" },
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
