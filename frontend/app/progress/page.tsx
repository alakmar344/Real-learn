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
        padding: "clamp(16px, 3vw, 22px)",
        boxShadow: "var(--shadow-sm)",
        gridColumn: span ? "1 / -1" : "auto",
      }}
    >
      {children}
    </section>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="stat-tile">
      <div className="stat-tile__value" style={accent ? { color: "var(--accent)" } : undefined}>
        {value}
      </div>
      <div className="stat-tile__label">{label}</div>
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

  // The stored streak only updates when a part is passed, so a lapsed streak
  // would display as alive forever. Show it as dead once the last activity is
  // more than a day old (unless a single missed day is still freeze-savable).
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
    <main style={{ minHeight: "100vh", color: "var(--text-primary)" }}>
      <Navbar />

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 20px 56px" }}>
        {/* Page heading */}
        <div style={{ marginBottom: 20 }}>
          <span className="section-overline" style={{ marginBottom: 6 }}>
            進捗 — Progress
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "clamp(26px, 5vw, 34px)",
              letterSpacing: "-0.02em",
            }}
          >
            Your Progress
          </h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)", fontSize: 14 }}>
            Every quiz you pass builds this. Keep the flame alive.
          </p>
        </div>
        <div className="kusari" style={{ margin: "0 0 24px", maxWidth: 240 }} aria-hidden="true">
          <span className="kusari__bead" />
        </div>

        {!mounted ? (
          <div style={{ height: 320 }} aria-hidden="true" />
        ) : (
          <>
            {/* Level hero */}
            <Card span>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <div
                  className="animate-level-burst"
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 800,
                    fontSize: 30,
                    flexShrink: 0,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {info.level}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    Level {info.level} · <span style={{ color: "var(--accent)" }}>{levelTitle(info.level)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 8 }}>
                    {info.totalXp.toLocaleString()} XP total
                  </div>
                  <div style={{ height: 12, borderRadius: 999, background: "var(--border-subtle)", overflow: "hidden" }}>
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
                  <div style={{ marginTop: 5, fontSize: 12, color: "var(--text-tertiary)", textAlign: "right" }}>
                    {info.intoLevel} / {info.forNext} XP to Level {info.level + 1}
                  </div>
                </div>
              </div>
            </Card>

            {/* Two-up: streak + daily goal */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 14 }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    className={displayStreak > 0 ? "flame-flicker" : undefined}
                    style={{ fontSize: 42, filter: displayStreak > 0 ? "none" : "grayscale(1)", lineHeight: 1 }}
                  >
                    🔥
                  </span>
                  <div>
                    <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{displayStreak}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>day streak</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
                  <span style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "4px 10px" }}>
                    Longest · <strong>{s.longestStreak}</strong>
                  </span>
                  <span style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "4px 10px" }}>
                    Freezes · <strong>{s.streakFreezes}</strong>
                  </span>
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                  {goalMetToday
                    ? "Today's goal is done — your streak is safe. See you tomorrow."
                    : "Complete today's daily goal to extend your streak."}
                </p>
              </Card>

              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <DailyGoalRing value={todayCount} goal={s.dailyGoal} size={56} stroke={6} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Daily goal</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      {Math.min(todayCount, s.dailyGoal)}/{s.dailyGoal} parts today
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Set your target</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[1, 3, 5, 8].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => s.setDailyGoal(g)}
                        style={{
                          border: `1px solid ${s.dailyGoal === g ? "var(--accent)" : "var(--border-default)"}`,
                          background: s.dailyGoal === g ? "var(--accent-dim)" : "transparent",
                          color: s.dailyGoal === g ? "var(--accent)" : "var(--text-secondary)",
                          borderRadius: "var(--radius-md)",
                          padding: "6px 14px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          minWidth: 40,
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
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Lifetime stats</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 10 }}>
                <StatTile label="Journeys" value={s.lessonsCompleted} accent />
                <StatTile label="Quizzes passed" value={s.partsPassed} />
                <StatTile label="Perfect runs" value={s.perfectLessons} />
                <StatTile label="Languages" value={s.languagesUsed.length} />
                <StatTile label="Subjects" value={s.subjectsSeen.length} />
                <StatTile label="Follow-ups" value={s.followUps} />
              </div>
            </Card>

            {/* Activity */}
            <div style={{ marginTop: 14 }} className="progress-activity">
              <Card span>
                <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Activity</h3>
                <ActivityHeatmap history={s.history} />
              </Card>
            </div>

            {/* Achievements */}
            <div style={{ marginTop: 14 }} className="progress-achievements">
              <Card span>
                <AchievementsGrid unlocked={s.badges} snapshot={snapshot} />
              </Card>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <Link
                href="/"
                style={{
                  display: "inline-block",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 26px",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  fontWeight: 700,
                  fontSize: 15,
                  textDecoration: "none",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                Learn something new →
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer />
    </main>
  );
}
