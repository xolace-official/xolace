import { ErrorRetry } from "@/components/shared/error-retry";

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
			message="We couldn't reach the App Store. Check your connection and try again."
			onRetry={onRetry}
			retrying={isRetrying}
			retryLabel="Try again"
			title="Plans are temporarily unavailable"
		/>
	);
}
