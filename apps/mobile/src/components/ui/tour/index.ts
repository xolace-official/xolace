import { TourRoot } from "@/components/ui/tour/tour-root";
import { TourStep } from "@/components/ui/tour/tour-step";

export const Tour = Object.assign(TourRoot, { Step: TourStep });

export type { TourStepProps } from "@/components/ui/tour/tour-step";
export type {
	TourLabels,
	TourPlacement,
	TourProps,
	TourShape,
} from "@/components/ui/tour/types";
