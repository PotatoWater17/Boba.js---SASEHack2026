/** Time helpers for Server Components (avoid inline Date.now in page files). */

const MS_DAY = 24 * 60 * 60 * 1000;

export function serverNowMs() {
  return Date.now();
}

export function serverWeekAgoMs() {
  return serverNowMs() - 7 * MS_DAY;
}

export function serverDayAgo() {
  return new Date(serverNowMs() - MS_DAY);
}

export function serverWeekAgo() {
  return new Date(serverNowMs() - 7 * MS_DAY);
}

export function serverTwoWeeksAgo() {
  return new Date(serverNowMs() - 14 * MS_DAY);
}

export function serverMonthAgo() {
  return new Date(serverNowMs() - 30 * MS_DAY);
}
