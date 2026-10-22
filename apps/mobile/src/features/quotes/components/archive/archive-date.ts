/**
 * `daily_quotes.date` is a UTC `YYYY-MM-DD`. Built from its parts rather than
 * parsed as an instant: `new Date("2026-09-05")` is UTC midnight, which is the
 * 4th in any negative offset, and the archive would label the card a day early.
 */
export function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const local = new Date(y, m - 1, d);
  return {
    dayMonth: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`,
    weekday: local.toLocaleDateString(undefined, { weekday: "long" }),
  };
}
