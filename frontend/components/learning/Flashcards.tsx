"use client";

/**
 * Flashcards — classic internet-style flip cards generated from the lesson.
 *
 * Appears as soon as a lesson is generated. Each card pairs a prompt built
 * from a lesson part (front) with the matching key takeaway (back), so it
 * works for freshly generated AND previously cached/saved lessons without
 * any backend changes. Click / Enter / Space flips the card in 3D; arrows,
 * dots and keyboard navigate the deck.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import removeMarkdown from "remove-markdown";
import { LessonJourney } from "@/types";
import { triggerHaptic } from "@/lib/haptics";

interface Card {
  front: string;
  hint: string;
  back: string;
}

export function buildFlashcards(lesson: LessonJourney): Card[] {
  const takeaways = (lesson.keyTakeaways ?? [])
    .map((t) => removeMarkdown(String(t ?? "")).trim())
    .filter(Boolean);
  if (takeaways.length === 0) return [];

  const parts = lesson.parts ?? [];
  return takeaways.map((back, i) => {
    // 3-part lessons have 3 takeaways that mirror the 3 parts; fast lessons
    // have 1 part and 2 takeaways — fall back to the last available part.
    const part = parts[Math.min(i, Math.max(parts.length - 1, 0))];
    const title = removeMarkdown(String(part?.title ?? lesson.topic ?? "")).trim();
    return {
      front: title || `Key idea ${i + 1}`,
      hint:
        parts.length > 1
          ? `Part ${Math.min(i + 1, parts.length)} · what's the key idea?`
          : `Key idea ${i + 1} · can you recall it?`,
      back,
    };
  });
}

interface Props {
  lesson: LessonJourney;
}

export default function Flashcards({ lesson }: Props) {
  const baseCards = useMemo(() => buildFlashcards(lesson), [lesson]);
  const [order, setOrder] = useState<number[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(() => new Set());
  const cardRef = useRef<HTMLButtonElement>(null);

  const cards = useMemo(
    () => (order ? order.map((i) => baseCards[i]).filter(Boolean) : baseCards),
    [baseCards, order]
  );

  // New lesson → reset the deck.
  useEffect(() => {
    setIndex(0);
    setFlipped(false);
    setSeen(new Set());
    setOrder(null);
  }, [lesson]);

  const shuffle = useCallback(() => {
    setOrder((prev) => {
      const next = (prev ?? baseCards.map((_, i) => i)).slice();
      // Fisher–Yates
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setIndex(0);
    setFlipped(false);
    setSeen(new Set());
    triggerHaptic("light");
  }, [baseCards]);

  const flip = useCallback(() => {
    setFlipped((f) => {
      if (!f) {
        triggerHaptic("light");
        setSeen((prev) => {
          if (prev.has(index)) return prev;
          const next = new Set(prev);
          next.add(index);
          return next;
        });
      }
      return !f;
    });
  }, [index]);

  const go = useCallback(
    (next: number) => {
      if (cards.length === 0) return;
      const clamped = (next + cards.length) % cards.length;
      setFlipped(false);
      setIndex(clamped);
    },
    [cards.length]
  );

  if (cards.length === 0) return null;

  const card = cards[index];
  const allSeen = seen.size >= cards.length;

  return (
    <section className="flashcards" aria-label="Flashcards for this lesson">
      <div className="flashcards__head">
        <h2 className="flashcards__title">Flashcards</h2>
        <div className="flashcards__head-right">
          <span className="flashcards__meta" aria-live="polite">
            {allSeen ? "Deck done — nice recall ✦" : `${seen.size}/${cards.length} flipped`}
          </span>
          <button
            type="button"
            className="btn-icon flashcards__shuffle"
            aria-label="Shuffle deck"
            title="Shuffle deck"
            disabled={cards.length < 2}
            onClick={shuffle}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M1.5 4h3l6 8h4m0 0-2-2m2 2-2 2M1.5 12h3l1.7-2.27M14.5 4h-4L9 6m5.5-2-2-2m2 2-2 2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <p className="flashcards__sub">
        Tap a card to flip it — recall the idea before peeking.
      </p>

      <div className="flashcards__stage">
        <button
          type="button"
          className="btn-icon flashcards__nav"
          aria-label="Previous card"
          disabled={cards.length < 2}
          onClick={() => go(index - 1)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flashcard-scene">
          <button
            type="button"
            ref={cardRef}
            className={`flashcard${flipped ? " flashcard--flipped" : ""}`}
            onClick={flip}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                go(index + 1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(index - 1);
              }
            }}
            aria-pressed={flipped}
            aria-label={
              flipped
                ? `Answer: ${card.back}. Press to see the prompt again.`
                : `Card ${index + 1} of ${cards.length}: ${card.front}. Press to reveal the answer.`
            }
          >
            <span className="flashcard__face flashcard__face--front" aria-hidden="true">
              <span className="flashcard__tag">{card.hint}</span>
              <span className="flashcard__text">{card.front}</span>
              <span className="flashcard__flip-hint">tap to flip ↺</span>
            </span>
            <span className="flashcard__face flashcard__face--back" aria-hidden="true">
              <span className="flashcard__tag flashcard__tag--answer">answer</span>
              <span className="flashcard__text flashcard__text--answer">{card.back}</span>
              <span className="flashcard__flip-hint">tap to flip back ↺</span>
            </span>
          </button>
        </div>

        <button
          type="button"
          className="btn-icon flashcards__nav"
          aria-label="Next card"
          disabled={cards.length < 2}
          onClick={() => go(index + 1)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="flashcards__dots" role="tablist" aria-label="Choose card">
        {cards.map((c, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Card ${i + 1}: ${c.front}`}
            className={`flashcards__dot${i === index ? " flashcards__dot--active" : ""}${
              seen.has(i) ? " flashcards__dot--seen" : ""
            }`}
            onClick={() => go(i)}
          />
        ))}
        <span className="flashcards__counter" aria-hidden="true">
          {index + 1} / {cards.length}
        </span>
      </div>
    </section>
  );
}
