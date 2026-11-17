import { AppText } from "@/components/shared/app-text";

/** Value line with "Xolace+" in accent. `text-white` because the art is always dark; a bare
 * nested <AppText> would re-inherit `text-foreground`. */
export const PlusValue = ({
	text,
	accent,
}: {
	text: string;
	accent: string;
}) => {
	const [before, after] = text.split("Xolace+");
	return (
		<AppText className="font-light text-[13px] text-white leading-5">
			{before}
			<AppText className="font-semibold" style={{ color: accent }}>
				Xolace+
			</AppText>
			{after ?? ""}
		</AppText>
	);
};
