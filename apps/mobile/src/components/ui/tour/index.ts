import { TourRoot } from "@/src/components/ui/tour/tour-root";
import { TourStep } from "@/src/components/ui/tour/tour-step";

export const Tour = Object.assign(TourRoot, { Step: TourStep });

export type { TourStepProps } from "@/src/components/ui/tour/tour-step";
export type {
  TourLabels,
  TourPlacement,
  TourProps,
  TourShape,
} from "@/src/components/ui/tour/types";
