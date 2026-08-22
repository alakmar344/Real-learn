"use client";

import Link from "next/link";
import Navbar from "@/components/shared/Navbar";
import dynamic from "next/dynamic";
import Footer from "@/components/shared/Footer";
import DailyGoalRing from "@/components/shared/DailyGoalRing";
import { useProgressStore } from "@/store/progressStore";
import { levelInfo, levelTitleKey, dayKey, displayableStreak, ProgressSnapshot } from "@/lib/achievements";
import { useMounted } from "@/hooks/useMounted";
import { useShallow } from "zustand/shallow";
import { Skeleton, SkeletonCard, SkeletonTile } from "@/components/shared/Skeleton";
import { Icon } from "@/components/shared/icons";

import { useTranslation } from "@/hooks/useTranslation";

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
  const { t } = useTranslation();
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
          <h1 className="page-hero__title">{t("progress.title")}</h1>
          <p className="page-hero__sub">{t("progress.sub")}</p>
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
                    {t("progress.level", { level: info.level, num: info.level })} · <em>{t(levelTitleKey(info.level))}</em>
                  </div>
                  <div className="level-hero__meta">{t("progress.xpTotal", { xp: info.totalXp.toLocaleString() })}</div>
                  <div className="xp-track">
                    <div
                      className="xp-track__fill animate-sheen"
                      style={{ width: `${Math.round(info.progress * 100)}%` }}
                    />
                  </div>
                  <div className="xp-track__note">
                    {t("progress.xpToNext", {
                      into: info.intoLevel,
                      forNext: info.forNext,
                      next: info.level + 1,
                      current: info.intoLevel,
                      total: info.forNext,
                    })}
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
                    <div className="stat-tile-2026__label">{t("progress.dayStreak")}</div>
                  </div>
                </div>
                <div className="pill-row">
                  <span className="pill-stat">
                    {t("progress.longest")} · <strong>{s.longestStreak}</strong>
                  </span>
                  <span className="pill-stat">
                    {t("progress.freezes")} · <strong>{s.streakFreezes}</strong>
                  </span>
                </div>
                <p className="flow-note">
                  {goalMetToday
                    ? t("progress.goalSafe")
                    : t("progress.goalExtend")}
                </p>
              </Card>

              <Card>
                <div className="streak-figure">
                  <DailyGoalRing value={todayCount} goal={s.dailyGoal} size={56} stroke={6} />
                  <div>
                    <div className="flow-card__title flow-card__title--tight">{t("progress.dailyGoal")}</div>
                    <div className="stat-tile-2026__label">
                      {t("progress.partsToday", {
                        count: Math.min(todayCount, s.dailyGoal),
                        goal: s.dailyGoal,
                        current: Math.min(todayCount, s.dailyGoal),
                        total: s.dailyGoal,
                      })}
                    </div>
                  </div>
                </div>
                <div className="flow-gap">
                  <div className="flow-label">{t("progress.setTarget")}</div>
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
              <h2 className="flow-card__title">{t("progress.lifetimeStats")}</h2>
              <div className="stat-band">
                <StatTile label={t("progress.journeys")} value={s.lessonsCompleted} accent />
                <StatTile label={t("progress.quizzesPassed")} value={s.partsPassed} />
                <StatTile label={t("progress.perfectRuns")} value={s.perfectLessons} />
                <StatTile label={t("progress.languages")} value={s.languagesUsed.length} />
                <StatTile label={t("progress.subjects")} value={s.subjectsSeen.length} />
                <StatTile label={t("progress.followUps")} value={s.followUps} />
              </div>
            </Card>

            {/* Activity */}
            <div className="flow-gap progress-activity">
              <Card>
                <h2 className="flow-card__title">{t("progress.activity")}</h2>
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
                {t("progress.learnSomethingNew")}
              </Link>
            </div>
          </>
        )}
      </div>

      <Footer className="app-footer" />
    </main>
  );
}
