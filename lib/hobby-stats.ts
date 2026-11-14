/**
 * Practice log stats. Pure functions; dates are compared in UTC, the same
 * zone Payload stores day-only dates in.
 */

export interface SessionLike {
  date: string;
  durationMinutes?: number | null;
}

export interface PracticeStats {
  sessionsThisMonth: number;
  minutesThisMonth: number;
  /** Consecutive weeks (Monday start) with at least one session. */
  weeklyStreak: number;
}

const DAY_MS = 86_400_000;

/** Monday 00:00 UTC of the week containing `date`, as epoch ms. */
export function weekStart(date: Date): number {
  const day = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const weekday = (new Date(day).getUTCDay() + 6) % 7; // Monday = 0
  return day - weekday * DAY_MS;
}

export function practiceStats(
  sessions: readonly SessionLike[],
  now: Date = new Date(),
): PracticeStats {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  let sessionsThisMonth = 0;
  let minutesThisMonth = 0;
  const weeks = new Set<number>();
  // Day-only dates are stored at noon, so count anything up to today's end.
  const endOfToday = Date.UTC(year, month, now.getUTCDate() + 1);

  for (const session of sessions) {
    const date = new Date(session.date);
    if (Number.isNaN(date.getTime()) || date.getTime() >= endOfToday) {
      continue;
    }
    weeks.add(weekStart(date));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month) {
      sessionsThisMonth += 1;
      minutesThisMonth += session.durationMinutes ?? 0;
    }
  }

  // A week in progress without a session doesn't break the streak yet.
  let week = weekStart(now);
  if (!weeks.has(week)) week -= 7 * DAY_MS;
  let weeklyStreak = 0;
  while (weeks.has(week)) {
    weeklyStreak += 1;
    week -= 7 * DAY_MS;
  }

  return { sessionsThisMonth, minutesThisMonth, weeklyStreak };
}

/** 95 → "1 h 35 min", 40 → "40 min". */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** 90 → "1:30", 3725 → "1:02:05". */
export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
