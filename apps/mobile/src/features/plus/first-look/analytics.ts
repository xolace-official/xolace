import type { PostHog } from "posthog-react-native";
import type { PlanId } from "@/features/purchases/plans";
import type { PaywallSurface } from "@/features/purchases/use-paywall";
import { intakeArmProps, prune } from "@/lib/intake-analytics";

export const INTAKE_PLUS_SURFACE =
	"intake_same_week" as const satisfies PaywallSurface;

const plusProps = (props: Record<string, unknown>) => ({
	...props,
	...intakeArmProps(),
	surface: INTAKE_PLUS_SURFACE,
});

export function trackPlusShown(posthog: PostHog) {
	posthog.capture("intake_plus_shown", plusProps({}));
	posthog.capture("paywall_opened", {
		session_count: 0,
		surface: INTAKE_PLUS_SURFACE,
	});
}

export function trackPlusRowOpened(posthog: PostHog, row: string) {
	posthog.capture("intake_plus_row_opened", plusProps({ row }));
}

export function trackPlusPlanPicked(posthog: PostHog, plan: PlanId) {
	posthog.capture("intake_plus_plan_picked", plusProps({ plan }));
}

export function trackPlusPurchased(
	posthog: PostHog,
	plan: PlanId,
	trial: boolean
) {
	posthog.capture(
		trial ? "intake_plus_trial_started" : "intake_plus_purchased",
		plusProps({ plan })
	);
}

export function trackPlusContinuedFree(posthog: PostHog, offered: boolean) {
	posthog.capture("intake_plus_continued_free", plusProps({}));
	if (offered) {
		posthog.capture("paywall_dismissed", {
			session_count: 0,
			surface: INTAKE_PLUS_SURFACE,
		});
	}
}

export function trackTalkDemoOpened(posthog: PostHog) {
	posthog.capture("intake_talk_demo_opened", plusProps({}));
}

export function trackTalkDemoFinished(
	posthog: PostHog,
	props: {
		endedBy: "reply" | "safety";
		mode: "voice" | "type" | null;
		voice: string;
	}
) {
	posthog.capture(
		"intake_talk_demo_finished",
		plusProps({
			ended_by: props.endedBy,
			...prune({ mode: props.mode }),
			voice: props.voice,
		})
	);
}
