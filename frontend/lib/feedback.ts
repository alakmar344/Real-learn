// Feedback collection helpers.
//
// RealLearn asks for a short, optional review the day after a user completes
// their FIRST learning journey. The review is deliberately anonymous:
//   - nothing is ever tied to the user's identity (no Clerk ID, email, or IP),
//   - we only ever transmit the review question/answer fields, and
//   - once a review has been given (or permanently dismissed), a local flag
//     records that so the prompt never reappears.
//
// Everything here lives in the browser only. localStorage access is wrapped in
// safeGetItem/safeSetItem-style guards so a blocked-storage browser (private
// mode, "Block all cookies") can never crash the app.

export const FEEDBACK_STORAGE_KEY = "reallearn-feedback";

/** Minimum gap between first completion and showing the prompt: 1 full day. */
export const FEEDBACK_ELIGIBLE_AFTER_MS = 24 * 60 * 60 * 1000;

export interface FeedbackRecord {
  /** Set true once a review is submitted or permanently dismissed. */
  given: boolean;
  /** ISO timestamp of when `given` became true. */
  givenAt?: string;
  /** Epoch ms of when to next show a snoozed prompt (0/unset = not snoozed). */
  snoozedUntil?: number;
  /** A local copy of the submitted review, kept for the user's own export. */
  review?: {
    rating: number;
    likes: string;
    improvements: string;
  };
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors (private mode, blocked cookies)
  }
}

export function readFeedback(): FeedbackRecord | null {
  const raw = safeGet(FEEDBACK_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as FeedbackRecord;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeFeedback(record: FeedbackRecord): void {
  safeSet(FEEDBACK_STORAGE_KEY, JSON.stringify(record));
}

/**
 * Mark that the user has given a review (or permanently declined). The prompt
 * will never show again once this is set. The optional `review` body is stored
 * locally only — it is never read back by the app UI, but is available to the
 * user via "Export My Data" so they can see what they submitted.
 */
export function markFeedbackGiven(review?: FeedbackRecord["review"]): void {
  writeFeedback({ given: true, givenAt: new Date().toISOString(), review });
}

/** Snooze the prompt for `days` days without marking it as permanently given. */
export function snoozeFeedback(days = 7): void {
  const existing = readFeedback() ?? { given: false };
  writeFeedback({ ...existing, given: false, snoozedUntil: Date.now() + days * 24 * 60 * 60 * 1000 });
}

export function clearFeedback(): void {
  try {
    window.localStorage.removeItem(FEEDBACK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Whether the feedback prompt should currently be shown.
 *
 * Eligibility requires ALL of:
 *   - a first lesson has actually been completed (`firstLessonCompletedAt` set),
 *   - at least one full day has passed since that first completion,
 *   - the user has not already given (or permanently declined) feedback, and
 *   - any snooze window has expired.
 */
export function isFeedbackEligible(firstLessonCompletedAt: number | null): boolean {
  if (!firstLessonCompletedAt) return false;
  const record = readFeedback();
  if (record?.given) return false;
  if (record?.snoozedUntil && record.snoozedUntil > Date.now()) return false;
  return Date.now() - firstLessonCompletedAt >= FEEDBACK_ELIGIBLE_AFTER_MS;
}
