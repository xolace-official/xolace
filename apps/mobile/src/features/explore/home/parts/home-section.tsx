import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SkeletonBreath } from "@/components/shared/skeleton";
import { EASING, EaseView } from "@/design/ease";
import { COPY } from "@/features/explore/copy";
import { HOME_S, HOME_TIMING } from "@/features/explore/explore-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

type Props = {
	title?: string;
	why?: string;
	/** Wraps the header (Because you named: its long-press menu). */
	headerWrap?: (header: ReactNode) => ReactNode;
	top?: number;
	/** While it loads, the header stays and this stands in for the content. */
	loading?: boolean;
	skeleton?: ReactNode;
	children: ReactNode;
};

/**
 * A section (handoff §1): 26 above, a Bricolage 20 header with an optional reason line, 12 to its
 * content. It is there at rest from the first frame. Content that replaces a skeleton fades in
 * over 200 ms; content that was never waited for is simply there. Reduce Motion: a cut.
 */
export function HomeSection({
	title,
	why,
	headerWrap,
	top = HOME_S.sectionTop,
	loading = false,
	skeleton,
	children,
}: Props) {
	const header = title ? <SectionHeader title={title} why={why} /> : null;
	return (
		<View style={{ gap: HOME_S.headerGap, paddingTop: top }}>
			{header && headerWrap ? headerWrap(header) : header}
			<SectionBody
				label={title ? `${COPY.loading}, ${title}` : COPY.loading}
				loading={loading}
				skeleton={skeleton}
			>
				{children}
			</SectionBody>
		</View>
	);
}

function SectionBody({
	loading,
	label,
	skeleton,
	children,
}: {
	loading: boolean;
	label: string;
	skeleton: ReactNode;
	children: ReactNode;
}) {
	const reduced = useEffectiveReducedMotion();
	const [swap, setSwap] = useState({ fade: false, was: loading });
	if (swap.was !== loading) {
		setSwap({ fade: !loading, was: loading });
	}
	if (loading) {
		return <SkeletonBreath label={label}>{skeleton}</SkeletonBreath>;
	}
	if (!swap.fade || reduced) {
		return children;
	}
	return (
		<EaseView
			animate={{ opacity: 1 }}
			initialAnimate={{ opacity: 0 }}
			transition={{
				duration: HOME_TIMING.swapMs,
				easing: EASING.easeOut,
				type: "timing",
			}}
		>
			{children}
		</EaseView>
	);
}

function SectionHeader({ title, why }: { title: string; why?: string }) {
	return (
		<View style={{ paddingHorizontal: HOME_S.gutter }}>
			<AppText accessibilityRole="header" variant="headline">
				{title}
			</AppText>
			{why ? (
				<AppText className="mt-0.75" color="muted" variant="detail">
					{why}
				</AppText>
			) : null}
		</View>
	);
}
