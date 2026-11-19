import { useReminderHandover } from "./use-reminder-handover";

/** Hands the old on-device daily quote reminders over to the server's push (B19). Draws nothing. */
export function ReminderHandoverHost() {
	useReminderHandover();
	return null;
}
