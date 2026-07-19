"use client";

import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import dynamic from "next/dynamic";
import Footer from "@/components/shared/Footer";
import DailyGoalRing from "@/components/shared/DailyGoalRing";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, levelTitle, dayKey, daysBetween, ProgressSnapshot } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { useShallow } from "zustand/shallow";

const ActivityHeatmap = dynamic(() => import("@/components/shared/ActivityHeatmap"), {
  loading: () => <div style={{ height: 140 }} aria-hidden="true" />,
  ssr: true,
});
const AchievementsGrid = dynamic(() => import("@/components/shared/AchievementsGrid"), {
  loading: () => <div style={{ height: 300 }} aria-hidden="true" />,
  ssr: true,
});

function Card({ children, span }: { children: React.ReactNode; span?: boolean }) {
  return (
    <section
      className="animate-fade-up"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-xl)",
        padding: "clamp(18px, 3.5vw, 26px)",
        boxShadow: "var(--shadow-sm)",
        gridColumn: span ? "1 / -1" : "auto",
        transition: "all 350ms var(--ease-color)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.boxShadow = "var(--shadow-md), var(--glass-edge)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {children}
    </section>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-surface)",
        padding: "16px 12px",
        textAlign: "center",
        transition: "all 300ms var(--ease-color)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--border-accent)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ? "var(--accent)" : "var(--text-primary)", lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const mounted = useMounted();
  const s = useProgressStore(
    useShallow((state) => ({
      xp: state.xp,
      dailyCount: state.dailyCount,
      dailyCountDay: state.dailyCountDay,
      dailyGoalMetDay: state.dailyGoalMetDay,
      lastActiveDay: state.lastActiveDay,
      streak: state.streak,
      streakFreezes: state.streakFreezes,
      longestStreak: state.longestStreak,
      dailyGoal: state.dailyGoal,
      lessonsCompleted: state.lessonsCompleted,
      partsPassed: state.partsPassed,
      perfectParts: state.perfectParts,
      perfectLessons: state.perfectLessons,
      languagesUsed: state.languagesUsed,
      subjectsSeen: state.subjectsSeen,
      followUps: state.followUps,
      dailyGoalsMet: state.dailyGoalsMet,
      lastActivityHour: state.lastActivityHour,
      history: state.history,
      badges: state.badges,
      setDailyGoal: state.setDailyGoal,
    }))
  );

  const info = levelInfo(s.xp);
  const todayCount = mounted && s.dailyCountDay === dayKey() ? s.dailyCount : 0;
  const goalMetToday = mounted && s.dailyGoalMetDay === dayKey();

  const streakGap =
    mounted && s.lastActiveDay ? daysBetween(dayKey(), s.lastActiveDay) : null;
  const displayStreak =
    streakGap === null
      ? 0
      : streakGap <= 1 || (streakGap === 2 && s.streakFreezes > 0)
        ? s.streak
        : 0;

  const snapshot: ProgressSnapshot = {
    xp: s.xp,
    level: info.level,
    streak: s.streak,
    longestStreak: s.longestStreak,
    lessonsCompleted: s.lessonsCompleted,
    partsPassed: s.partsPassed,
    perfectParts: s.perfectParts,
    perfectLessons: s.perfectLessons,
    languagesUsed: s.languagesUsed,
    subjectsSeen: s.subjectsSeen,
    followUps: s.followUps,
    dailyGoalsMet: s.dailyGoalsMet,
    lastActivityHour: s.lastActivityHour,
  };

  return (
    <main style={{ minHeight: "100vh", color: "var(--text-primary)" }} className="page-enter">
      <Navbar />

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 56px" }}>
        {/* Page heading */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(28px, 5vw, 38px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Your Progress
          </h1>
          <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.6 }}>
            Every quiz you pass builds this. Keep the flame alive.
          </p>
        </div>

        {!mounted ? (
          <div style={{ height: 320 }} aria-hidden="true" />
        ) : (
          <>
            {/* Level hero */}
            <Card span>
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div
                  className="animate-level-burst"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 32,
                    flexShrink: 0,
                    boxShadow: "var(--shadow-glow-accent)",
                  }}
                >
                  {info.level}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
                    Level {info.level} · <span style={{ color: "var(--accent)" }}>{levelTitle(info.level)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4, marginBottom: 10 }}>
                    {info.totalXp.toLocaleString()} XP total
                  </div>
                  <div style={{ height: 14, borderRadius: 999, background: "var(--border-subtle)", overflow: "hidden" }}>
                    <div
                      className="animate-sheen"
                      style={{
                        position: "relative",
                        width: `${Math.round(info.progress * 100)}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, var(--accent), var(--accent-hover))",
                        borderRadius: 999,
                        transition: "width 700ms var(--ease-reveal)",
                        overflow: "hidden",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-tertiary)", textAlign: "right", fontWeight: 500 }}>
                    {info.intoLevel} / {info.forNext} XP to Level {info.level + 1}
                  </div>
                </div>
              </div>
            </Card>

            {/* Two-up: streak + daily goal */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 16 }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span
                    className={displayStreak > 0 ? "flame-flicker" : undefined}
                    style={{ fontSize: 44, filter: displayStreak > 0 ? "none" : "grayscale(1)", lineHeight: 1 }}
                    aria-hidden="true"
                  >
                    🔥
                  </span>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{displayStreak}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      day streak
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
                  <span style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "5px 12px", fontWeight: 600 }}>
                    Longest · <strong>{s.longestStreak}</strong>
                  </span>
                  <span style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "5px 12px", fontWeight: 600 }}>
                    Freezes · <strong>{s.streakFreezes}</strong>
                  </span>
                </div>
                <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                  {goalMetToday
                    ? "Today&apos;s goal is done — your streak is safe. See you tomorrow."
                    : "Complete today&apos;s daily goal to extend your streak."}
                </p>
              </Card>

              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <DailyGoalRing value={todayCount} goal={s.dailyGoal} size={60} stroke={6} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>Daily goal</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                      {Math.min(todayCount, s.dailyGoal)}/{s.dailyGoal} parts today
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Set your target
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[1, 3, 5, 8].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => s.setDailyGoal(g)}
                        className="interactive-focus"
                        style={{
                          border: `1px solid ${s.dailyGoal === g ? "var(--accent)" : "var(--border-default)"}`,
                          background: s.dailyGoal === g ? "var(--accent-dim)" : "transparent",
                          color: s.dailyGoal === g ? "var(--accent)" : "var(--text-secondary)",
                          borderRadius: "var(--radius-md)",
                          padding: "8px 16px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          minWidth: 44,
                          transition: "all 250ms var(--ease-spring)",
                        }}
                        onMouseEnter={(e) => {
                          if (s.dailyGoal !== g) {
                            e.currentTarget.style.borderColor = "var(--border-accent)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (s.dailyGoal !== g) {
                            e.currentTarget.style.borderColor = "var(--border-default)";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Lifetime stats */}
            <Card span>
              <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)" }}>
                Lifetime stats
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12 }}>
                <StatTile label="Journeys" value={s.lessonsCompleted} accent />
                <StatTile label="Quizzes passed" value={s.partsPassed} />
                <StatTile label="Perfect runs" value={s.perfectLessons} />
                <StatTile label="Languages" value={s.languagesUsed.length} />
                <StatTile label="Subjects" value={s.subjectsSeen.length} />
                <StatTile label="Follow-ups" value={s.followUps} />
              </div>
            </Card>

            {/* Activity */}
            <div style={{ marginTop: 16 }} className="progress-activity">
              <Card span>
                <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-tertiary)" }}>
                  Activity
                </h3>
                <ActivityHeatmap history={s.history} />
              </Card>
            </div>

            {/* Achievements */}
            <div style={{ marginTop: 16 }} className="progress-achievements">
              <Card span>
                <AchievementsGrid unlocked={s.badges} snapshot={snapshot} />
              </Card>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Link
                href="/"
                className="interactive-press"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 28px",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: "none",
                  minHeight: 50,
                  boxShadow: "var(--shadow-glow-accent)",
                  transition: "all 300ms var(--ease-spring)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.04)";
                  e.currentTarget.style.boxShadow = "var(--shadow-lg), var(--glass-edge)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "var(--shadow-glow-accent)";
                }}
              >
                Learn something new
                <span aria-hidden="true" style={{ fontSize: 16 }}>→</span>
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}
