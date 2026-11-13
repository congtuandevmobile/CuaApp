import type { Activity } from './Activity';

const DAY_MS = 86_400_000;

/** Local midnight of the day that contains `ms`. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Monday 00:00 of the week that contains `ms` (ISO weeks start on Monday). */
export function startOfWeek(ms: number): number {
  const day = startOfDay(ms);
  const weekday = (new Date(day).getDay() + 6) % 7; // Monday = 0
  return day - weekday * DAY_MS;
}

export interface PeriodTotals {
  readonly meters: number;
  readonly durationMs: number;
  readonly count: number;
}

export function totals(activities: readonly Activity[], fromMs: number, toMs: number): PeriodTotals {
  let meters = 0;
  let durationMs = 0;
  let count = 0;
  for (const a of activities) {
    if (a.startedAtMs < fromMs || a.startedAtMs >= toMs) continue;
    meters += a.distanceMeters;
    durationMs += a.durationMs;
    count += 1;
  }
  return { meters, durationMs, count };
}

/** Distance per day of the current week, Monday first (7 numbers, metres). */
export function weekDailyMeters(activities: readonly Activity[], nowMs: number): number[] {
  const monday = startOfWeek(nowMs);
  const days = [0, 0, 0, 0, 0, 0, 0];
  for (const a of activities) {
    const i = Math.floor((a.startedAtMs - monday) / DAY_MS);
    if (i >= 0 && i < 7) days[i]! += a.distanceMeters;
  }
  return days;
}

/** Consecutive days with at least one activity, ending today (or yesterday if nothing yet today). */
export function dayStreak(activities: readonly Activity[], nowMs: number): number {
  const days = new Set(activities.map((a) => startOfDay(a.startedAtMs)));
  let day = startOfDay(nowMs);
  if (!days.has(day)) day -= DAY_MS;
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day -= DAY_MS;
  }
  return streak;
}

/** The daily distance goal shown by the home ring. */
export const DAILY_GOAL_METERS = 8000;
