import { ErrorRetry } from "@/components/shared/error-retry";
import { PAYWALL } from "./copy";

type Props = {
	isRetrying: boolean;
	onRetry: () => void;
};

/** Replaces the picker and CTA when the store returned no packages; a dead purchase button
 * fails App Review 2.1. The error pattern: the line, then Try again in glass. */
export function PaywallPlansUnavailable({ isRetrying, onRetry }: Props) {
	return (
		<ErrorRetry
			className="py-4"
			inline
			message={PAYWALL.unavailable.message}
			onRetry={onRetry}
			retrying={isRetrying}
			retryLabel={PAYWALL.unavailable.retry}
			title={PAYWALL.unavailable.title}
		/>
	);
}
