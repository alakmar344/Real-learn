"use client";

import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import dynamic from "next/dynamic";
import Footer from "@/components/shared/Footer";
import DailyGoalRing from "@/components/shared/DailyGoalRing";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, levelTitle, dayKey, displayableStreak, ProgressSnapshot } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { useShallow } from "zustand/shallow";
import { Skeleton, SkeletonCard, SkeletonTile } from "@/components/shared/Skeleton";
import { Icon } from "@/components/shared/icons";

const ActivityHeatmap = dynamic(() => import("@/components/shared/ActivityHeatmap"), {
  loading: () => <Skeleton height={140} borderRadius="var(--radius-xl)" />,
  ssr: true,
});
const AchievementsGrid = dynamic(() => import("@/components/shared/AchievementsGrid"), {
  loading: () => (
    <div className="stat-band">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonTile key={i} />
      ))}
    </div>
  ),
  ssr: true,
});

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`animate-fade-up progress-hero-card${className ? ` ${className}` : ""}`}>
      {children}
    </section>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="stat-tile-2026">
      <div className={`stat-tile-2026__value${accent ? " stat-tile-2026__value--accent" : ""}`}>
        {value}
      </div>
      <div className="stat-tile-2026__label">{label}</div>
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
  // would display as alive forever. displayableStreak shows it as dead once
  // the last activity is more than a day old (unless freeze-savable) — the
  // same check ProgressHub and HomeStats use.
  const displayStreak = mounted
    ? displayableStreak(s.streak, s.lastActiveDay, s.streakFreezes)
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
    <main className="flow-page">
      <Navbar />

      <div className="flow-page__inner">
        <header className="page-hero">
          <span className="page-hero__glyph" aria-hidden="true">
            {mounted ? info.level : "•"}
          </span>
          <span className="section-overline">Your Journey</span>
          <h1 className="page-hero__title">Progress</h1>
          <p className="page-hero__sub">Every quiz you pass builds this — at your own pace.</p>
        </header>

        {!mounted ? (
          <div className="flow-stack" aria-label="Loading progress...">
            <SkeletonCard height={120} />
            <div className="duo-grid">
              <SkeletonCard height={150} />
              <SkeletonCard height={150} />
            </div>
            <div className="stat-band">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Level hero */}
            <Card>
              <div className="level-hero">
                <div className="level-orb animate-level-burst">{info.level}</div>
                <div className="level-hero__body">
                  <div className="level-hero__name">
                    Level {info.level} · <em>{levelTitle(info.level)}</em>
                  </div>
                  <div className="level-hero__meta">{info.totalXp.toLocaleString()} XP total</div>
                  <div className="xp-track">
                    <div
                      className="xp-track__fill animate-sheen"
                      style={{ width: `${Math.round(info.progress * 100)}%` }}
                    />
                  </div>
                  <div className="xp-track__note">
                    {info.intoLevel} / {info.forNext} XP to Level {info.level + 1}
                  </div>
                </div>
              </div>
            </Card>

            {/* Two-up: streak + daily goal */}
            <div className="duo-grid">
              <Card>
                <div className="streak-figure">
                  <span
                    className={
                      displayStreak > 0
                        ? "streak-figure__emoji flame-flicker"
                        : "streak-figure__emoji streak-figure__emoji--dead"
                    }
                  >
                    <Icon name="flame" size={42} />
                  </span>
                  <div>
                    <div className="streak-figure__count">{displayStreak}</div>
                    <div className="stat-tile-2026__label">day streak</div>
                  </div>
                </div>
                <div className="pill-row">
                  <span className="pill-stat">
                    Longest · <strong>{s.longestStreak}</strong>
                  </span>
                  <span className="pill-stat">
                    Freezes · <strong>{s.streakFreezes}</strong>
                  </span>
                </div>
                <p className="flow-note">
                  {goalMetToday
                    ? "Today's goal is done — your streak is safe. See you tomorrow."
                    : "Complete today's daily goal to extend your streak."}
                </p>
              </Card>

              <Card>
                <div className="streak-figure">
                  <DailyGoalRing value={todayCount} goal={s.dailyGoal} size={56} stroke={6} />
                  <div>
                    <div className="flow-card__title flow-card__title--tight">Daily goal</div>
                    <div className="stat-tile-2026__label">
                      {Math.min(todayCount, s.dailyGoal)}/{s.dailyGoal} parts today
                    </div>
                  </div>
                </div>
                <div className="flow-gap">
                  <div className="flow-label">Set your target</div>
                  <div className="chip-row">
                    {[1, 3, 5, 8].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => s.setDailyGoal(g)}
                        className={`goal-chip${s.dailyGoal === g ? " goal-chip--active" : ""}`}
                        aria-pressed={s.dailyGoal === g}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Lifetime stats */}
            <Card className="flow-gap">
              <h2 className="flow-card__title">Lifetime stats</h2>
              <div className="stat-band">
                <StatTile label="Journeys" value={s.lessonsCompleted} accent />
                <StatTile label="Quizzes passed" value={s.partsPassed} />
                <StatTile label="Perfect runs" value={s.perfectLessons} />
                <StatTile label="Languages" value={s.languagesUsed.length} />
                <StatTile label="Subjects" value={s.subjectsSeen.length} />
                <StatTile label="Follow-ups" value={s.followUps} />
              </div>
            </Card>

            {/* Activity */}
            <div className="flow-gap progress-activity">
              <Card>
                <h2 className="flow-card__title">Activity</h2>
                <ActivityHeatmap history={s.history} />
              </Card>
            </div>

            {/* Achievements */}
            <div className="flow-gap progress-achievements pattern-seigaiha">
              <Card>
                <AchievementsGrid unlocked={s.badges} snapshot={snapshot} />
              </Card>
            </div>

            <div className="flow-cta-row">
              <Link href="/" className="btn-primary">
                Learn something new →
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer className="app-footer" />
    </main>
  );
}
