/** `daily_quotes.date` is a UTC `YYYY-MM-DD`, built from its parts: parsed as an instant it is
 * UTC midnight, a day early in any negative offset. */
export function formatDate(date: string) {
	const [y, m, d] = date.split("-").map(Number);
	const local = new Date(y, m - 1, d);
	return {
		dayMonth: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`,
		weekday: local.toLocaleDateString(undefined, { weekday: "long" }),
	};
}
