"use client";

const EXAMPLES = [
  "Why does the sky turn red at sunset?",
  "How does inflation destroy economies?",
  "What actually happens inside a black hole?",
  "Why did the Roman Empire collapse?",
  "How do vaccines teach the immune system?",
];

interface Props {
  onPick?: (question: string) => void;
}

export default function ExampleQuestions({ onPick }: Props) {
  const example = EXAMPLES[0];

  return (
    <button
      type="button"
      aria-label="Use an example question"
      title="Click to use this example"
      onClick={() => onPick?.(example)}
      disabled={!onPick}
      className="chip chip--example"
    >
      <span className="chip__label">Example</span>
      <span className="chip__value">{example}</span>
    </button>
  );
}
