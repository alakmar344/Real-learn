"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { Icon } from "@/components/shared/icons";
import MathText from "@/components/shared/MathText";
import { SkeletonCard } from "@/components/shared/Skeleton";
import { useMounted } from "@/hooks/useMounted";
import { useFrontier } from "@/hooks/useFrontier";
import { useLesson } from "@/hooks/useLesson";
import type { Recommendation } from "@/lib/knowledgeFrontier";

const KIND_ICON: Record<Recommendation["kind"], Parameters<typeof Icon>[0]["name"]> = {
  resume: "refresh",
  bridge: "infinity",
  deepen: "layers",
  explore: "sparkle",
};

const KIND_LABEL: Record<Recommendation["kind"], string> = {
  resume: "Resume",
  bridge: "Bridge",
  deepen: "Go deeper",
  explore: "Explore",
};

export default function FindPage() {
  const mounted = useMounted();
  const { frontier, recommendations, discover, discoverState, resetDiscover } =
    useFrontier();
  const { generateLesson } = useLesson();

  const [goal, setGoal] = useState("");

  const launch = (question: string) => {
    void generateLesson(question, true);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = goal.trim();
    if (!trimmed) return;
    void discover(trimmed);
  };

  const strengthPct = Math.round(frontier.strength * 100);
  const coveragePct = discoverState.connections
    ? Math.round(discoverState.connections.coverage * 100)
    : 0;

  return (
    <main className="flow-page">
      <Navbar />

      <div className="flow-page__inner">
        <header className="page-hero">
          <span className="page-hero__glyph" aria-hidden="true">
            <Icon name="compass" size={22} />
          </span>
          <span className="section-overline">Your Learning Frontier</span>
          <h1 className="page-hero__title">Find</h1>
          <p className="page-hero__sub">
            A chatbot answers and forgets. RealLearn remembers what you&apos;ve{" "}
            <em>proven</em> you know — every quiz you pass — and finds the best next
            thing to learn just for you.
          </p>
        </header>

        {!mounted ? (
          <div className="flow-stack" aria-label="Loading your frontier...">
            <SkeletonCard height={140} />
            <SkeletonCard height={180} />
            <SkeletonCard height={180} />
          </div>
        ) : (
          <div className="flow-stack">
            {/* ── Goal search: find the gaps behind what you want to learn ── */}
            <section className="frontier-card">
              <div className="frontier-card__head">
                <h2 className="frontier-card__title">
                  <Icon name="target" size={16} /> What do you want to understand?
                </h2>
                <p className="frontier-card__hint">
                  We&apos;ll map it against what you&apos;ve already proven — and find
                  the shortest path forward.
                </p>
              </div>

              <form className="frontier-search" onSubmit={onSearch}>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. How do black holes bend light?"
                  aria-label="What do you want to understand?"
                  className="frontier-search__input"
                  maxLength={160}
                />
                <button
                  type="submit"
                  className="btn-primary frontier-search__btn"
                  disabled={discoverState.loading || !goal.trim()}
                >
                  {discoverState.loading ? "Finding…" : "Find my path"}
                </button>
              </form>

              {discoverState.connections && (
                <div className="frontier-result">
                  {discoverState.connections.prerequisitesKnown.length > 0 ? (
                    <>
                      <p className="frontier-result__lead">
                        You&apos;ve already proven{" "}
                        <strong>
                          {discoverState.connections.prerequisitesKnown.length}
                        </strong>{" "}
                        related concept
                        {discoverState.connections.prerequisitesKnown.length > 1
                          ? "s"
                          : ""}{" "}
                        — lean on {coveragePct}% of what this needs:
                      </p>
                      <div className="frontier-chips">
                        {discoverState.connections.prerequisitesKnown
                          .slice(0, 8)
                          .map((n) => (
                            <span key={n.id} className="frontier-chip frontier-chip--proven">
                              <Icon name="check" size={11} />
                              <MathText text={n.topic} />
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <p className="frontier-result__lead">
                      <Icon name="rocket" size={14} /> This is brand-new territory for
                      you — a perfect place to expand your map. Start below.
                    </p>
                  )}

                  <div className="frontier-cta-row">
                    <button type="button" className="btn-primary" onClick={() => launch(goal.trim())}>
                      Start this journey →
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => { setGoal(""); resetDiscover(); }}>
                      Clear
                    </button>
                  </div>

                  {discoverState.cards.length > 0 && (
                    <div className="frontier-discover">
                      <p className="frontier-subhead">
                        <Icon name="compass" size={13} /> Related paths other learners
                        explored
                      </p>
                      <ul className="frontier-discover__list">
                        {discoverState.cards.map((card, i) => (
                          <li key={card.id ?? `${card.title}-${i}`} className="frontier-discover__item">
                            <button
                              type="button"
                              className="frontier-discover__btn"
                              onClick={() => launch(card.title)}
                              title={`Learn: ${card.title}`}
                            >
                              <span className="frontier-discover__title">
                                <MathText text={card.title} />
                              </span>
                              {card.summary ? (
                                <span className="frontier-discover__summary">
                                  {card.summary}
                                </span>
                              ) : null}
                              <span className="frontier-discover__subject">
                                {card.subject}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {discoverState.error && (
                    <p className="frontier-note">
                      Showing your on-device map — related lessons couldn&apos;t load
                      right now.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* ── Next-step recommendations, grounded in the frontier ── */}
            <section className="frontier-card">
              <div className="frontier-card__head">
                <h2 className="frontier-card__title">
                  <Icon name="sparkle" size={16} /> Your next best moves
                </h2>
                <p className="frontier-card__hint">
                  Chosen from what you&apos;ve proven — not generic suggestions.
                </p>
              </div>
              <ul className="frontier-recs">
                {recommendations.map((rec, i) => (
                  <li key={`${rec.kind}-${i}`} className="frontier-rec">
                    <button
                      type="button"
                      className="frontier-rec__btn"
                      onClick={() => launch(rec.question)}
                      title={`Learn: ${rec.question}`}
                    >
                      <span className={`frontier-rec__kind frontier-rec__kind--${rec.kind}`}>
                        <Icon name={KIND_ICON[rec.kind]} size={12} />
                        {KIND_LABEL[rec.kind]}
                      </span>
                      <span className="frontier-rec__q">
                        <MathText text={rec.question} />
                      </span>
                      <span className="frontier-rec__reason">{rec.reason}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* ── The proven map — the moat, made visible ── */}
            <section className="frontier-card">
              <div className="frontier-card__head">
                <h2 className="frontier-card__title">
                  <Icon name="map" size={16} /> Your proven map
                </h2>
                <p className="frontier-card__hint">
                  {frontier.provenConcepts > 0
                    ? "Everything here you didn't just read — you passed the quiz."
                    : "Pass a lesson's quizzes and it becomes part of your permanent map."}
                </p>
              </div>

              <div className="frontier-stats">
                <div className="frontier-stat">
                  <span className="frontier-stat__value">{frontier.provenConcepts}</span>
                  <span className="frontier-stat__label">concepts proven</span>
                </div>
                <div className="frontier-stat">
                  <span className="frontier-stat__value">{frontier.inProgress.length}</span>
                  <span className="frontier-stat__label">in progress</span>
                </div>
                <div className="frontier-stat">
                  <span className="frontier-stat__value">{frontier.subjects.length}</span>
                  <span className="frontier-stat__label">subjects explored</span>
                </div>
                <div className="frontier-stat">
                  <span className="frontier-stat__value">{strengthPct}%</span>
                  <span className="frontier-stat__label">mastery strength</span>
                </div>
              </div>

              {frontier.mastered.length > 0 && (
                <div className="frontier-block">
                  <p className="frontier-subhead">
                    <Icon name="check" size={13} /> Proven
                  </p>
                  <div className="frontier-chips">
                    {frontier.mastered.slice(0, 16).map((n) => (
                      <span key={n.id} className="frontier-chip frontier-chip--proven">
                        <MathText text={n.topic} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {frontier.inProgress.length > 0 && (
                <div className="frontier-block">
                  <p className="frontier-subhead">
                    <Icon name="clock" size={13} /> Pick up where you left off
                  </p>
                  <ul className="frontier-resume">
                    {frontier.inProgress.slice(0, 5).map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className="frontier-resume__btn"
                          onClick={() => launch(n.question)}
                          title={`Resume: ${n.question}`}
                        >
                          <span className="frontier-resume__q">
                            <MathText text={n.topic} />
                          </span>
                          <span className="frontier-resume__meta">
                            {n.partsDone}/{n.partsTotal} parts
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {frontier.provenConcepts === 0 && frontier.inProgress.length === 0 && (
                <div className="frontier-empty">
                  <p>Your map is empty — for now.</p>
                  <Link href="/" className="btn-primary">
                    Start your first journey →
                  </Link>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <Footer className="app-footer" />
    </main>
  );
}
