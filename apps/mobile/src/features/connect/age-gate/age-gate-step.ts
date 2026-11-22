import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import { chatLimitError } from "../chat-rules";

type AgeStatus = FunctionReturnType<
	typeof api.age.declarations.status
>["status"];

export type AgeGateStep = "ask" | "declined" | "not_available" | "under_13";

export type AgeGateSurface = "xolacer_chat" | "letters";

export const AGE_PROMPT_VERSIONS: Record<AgeGateSurface, string> = {
	letters: "letters.v1",
	xolacer_chat: "xolacer_chat.v1",
};

export function stepForStatus(
	status: AgeStatus | undefined
): AgeGateStep | null {
	switch (status) {
		case "unknown":
			return "ask";
		case "13_17":
			return "not_available";
		case "under_13":
			return "under_13";
		default:
			return null;
	}
}

export function stepForError(error: unknown): AgeGateStep | null {
	const data = chatLimitError(error);
	if (data?.code === "age_required") {
		return "ask";
	}
	if (data?.code === "age_restricted") {
		return data.status === "under_13" ? "under_13" : "not_available";
	}
	return null;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function calendarDate(date: Date): string {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
