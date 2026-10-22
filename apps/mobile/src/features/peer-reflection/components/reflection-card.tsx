import { SymbolView } from "expo-symbols";
import { Card, Chip, cn, PressableFeedback } from "heroui-native";
import { type ColorValue, StyleSheet, View } from "react-native";
import { EaseView } from "react-native-ease/uniwind";
import { useCSSVariable, withUniwind } from "uniwind";
import { TruncatedText } from "@/src/features/peer-reflection/components/truncated-text";
import { playResonanceToggle } from "@/src/lib/haptics";

const StyledSymbolView = withUniwind(SymbolView);

const EASE_INITIAL = { opacity: 0, translateY: 20 };
const EASE_ANIMATE = { opacity: 1, translateY: 0 };
const HEART_FILLED = {
	android: "favorite",
	ios: "heart.fill",
	web: "favorite",
} as const;
const HEART_OUTLINE = {
	android: "favorite_border",
	ios: "heart",
	web: "favorite_border",
} as const;

type Props = {
	text: string;
	index: number;
	resonanceCount: number;
	resonated: boolean;
	onToggleResonance: () => void | Promise<void>;
	onRequestReport: () => void;
};

export const ReflectionCard = ({
	text,
	index,
	resonanceCount,
	resonated,
	onToggleResonance,
	onRequestReport,
}: Props) => {
	const resonanceColor = useCSSVariable("--color-resonance-foreground");

	const handleResonance = () => {
		playResonanceToggle();
		onToggleResonance();
	};

	const easeTransition = {
		delay: 200 + index * 150,
		duration: 500,
		easing: [0.455, 0.03, 0.515, 0.955] as [number, number, number, number],
		type: "timing" as const,
	};

	return (
		<EaseView
			animate={EASE_ANIMATE}
			initialAnimate={EASE_INITIAL}
			transition={easeTransition}
		>
			<PressableFeedback delayLongPress={400} onLongPress={onRequestReport}>
				<Card
					className="rounded-2xl border border-foreground/10"
					style={styles.card}
					variant="tertiary"
				>
					<Card.Body className="gap-5 px-4 py-4">
						<View>
							<TruncatedText
								className="text-base text-foreground italic leading-7"
								text={text}
							/>
						</View>

						<View>
							<Chip
								animation="disable-all"
								className={cn(
									"self-end border border-foreground/10 p-2",
									resonated && "border-resonance-foreground bg-resonance"
								)}
								color={resonated ? "accent" : "default"}
								onPress={handleResonance}
								size="sm"
								variant="tertiary"
							>
								<StyledSymbolView
									name={resonated ? HEART_FILLED : HEART_OUTLINE}
									size={14}
									tintColor={resonanceColor as ColorValue}
								/>
								<Chip.Label
									className={cn(
										resonated
											? "text-resonance-foreground"
											: "text-foreground/30"
									)}
								>
									{resonated ? `${resonanceCount} resonated` : "This resonates"}
								</Chip.Label>
							</Chip>
						</View>
					</Card.Body>
				</Card>
			</PressableFeedback>
		</EaseView>
	);
};

const styles = StyleSheet.create({
	card: { borderCurve: "continuous" },
});
