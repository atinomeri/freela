export function parseDailySendTime(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function deriveDailySendTimeFromDate(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function nextDailyRunFrom(now: Date, dailySendTime: string): Date {
  const parsed = parseDailySendTime(dailySendTime);
  if (!parsed) {
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }

  const candidate = new Date(now);
  candidate.setHours(parsed.hour, parsed.minute, 0, 0);
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

export function nextDailyRunAfter(currentScheduledAt: Date, dailySendTime?: string | null): Date {
  const next = new Date(currentScheduledAt);
  next.setDate(next.getDate() + 1);

  if (dailySendTime) {
    const parsed = parseDailySendTime(dailySendTime);
    if (parsed) {
      next.setHours(parsed.hour, parsed.minute, 0, 0);
      return next;
    }
  }

  next.setSeconds(0, 0);
  return next;
}
