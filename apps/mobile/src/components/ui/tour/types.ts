import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
} from "react";
import type { ViewInstance } from "react-native";

export type TourShape = "rect" | "circle";
export type TourPlacement = "top" | "bottom" | "auto";

/** Room left between the cutout and the target inside it. */
export const DEFAULT_PADDING = 8;
/** Corner radius of a rectangular cutout. */
export const DEFAULT_RADIUS = 12;
/** Gap between the cutout and the card. */
export const CARD_OFFSET = 12;
/** Smallest gap allowed between the card and the edge of the safe area. */
export const SCREEN_MARGIN = 16;
/** Ceiling on the card's width, so it does not run edge to edge on a tablet. */
export const MAX_CARD_WIDTH = 420;
/** How the spotlight travels from one target to the next. */
export const SPRING = { damping: 20, mass: 0.6, stiffness: 180 };
/** The dim laid over everything outside the cutout. */
export const DEFAULT_OVERLAY = "rgba(0, 0, 0, 0.66)";

/** The words on the card's controls, for a tour that is not in English. */
export type TourLabels = {
	next?: string;
	back?: string;
	done?: string;
	skip?: string;
	close?: string;
};

export const DEFAULT_LABELS: Required<TourLabels> = {
	back: "Back",
	close: "End tour",
	done: "Done",
	next: "Next",
	skip: "Skip",
};

export type TourProps = {
	children?: ReactNode;
	/** Whether the walkthrough is running. */
	open?: boolean;
	/** Whether it is running when uncontrolled. */
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** The current step's `order`, controlled. The author's numbering, not a position in the
	 * sequence. */
	step?: number;
	/** Where an uncontrolled tour starts. Defaults to the lowest `order`. */
	defaultStep?: number;
	/** Fires with the `order` about to be shown; measured next frame, so a `scrollTo` issued
	 * here lands first. */
	onStepChange?: (step: number) => void;
	/** The last step was acknowledged. */
	onFinish?: () => void;
	/** The tour was ended early — the skip control, the backdrop, or Android back. */
	onSkip?: () => void;
	/** Room left around every target, in pixels. 8 by default. A step may override it. */
	padding?: number;
	/** Corner radius of a rectangular cutout, in pixels. 12 by default. A step may override it. */
	radius?: number;
	/** Shape of every cutout. A step may override it. */
	shape?: TourShape;
	/** Side the card prefers. `auto` puts it below when that fits, else above. */
	placement?: TourPlacement;
	/** Ending the tour by pressing the dimmed area, or Android back. Default true. */
	dismissible?: boolean;
	/** Show "2 of 5" above the step's title. Default true. */
	showProgress?: boolean;
	/** Show the skip control. Default true. */
	showSkip?: boolean;
	/** Leave the spotlit control pressable. Off by default; the target keeps its own `onPress`. */
	interactive?: boolean;
	/** The dim laid over everything outside the cutout. Black at 66% by default. */
	overlayColor?: string;
	/** The words on the card's controls. */
	labels?: TourLabels;
	/** Extra classes for the card. */
	cardClassName?: string;
};

export type Rect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

/** One step as the root sees it. Holds the ref, not a rect: a rect taken at registration goes
 * stale. */
export type TourStepEntry = {
	order: number;
	title?: string;
	description?: string;
	icon?: ReactNode;
	cutout?: boolean;
	shape?: TourShape;
	padding?: number;
	radius?: number;
	placement?: TourPlacement;
	target: RefObject<ViewInstance | null>;
};

type TourContextValue = {
	register: (entry: TourStepEntry) => void;
	unregister: (entry: TourStepEntry) => void;
};

export const TourContext = createContext<TourContextValue | null>(null);

export function useTourContext(component: string): TourContextValue {
	const context = useContext(TourContext);
	if (!context) {
		throw new Error(`${component} must be used within a <Tour>`);
	}
	return context;
}
