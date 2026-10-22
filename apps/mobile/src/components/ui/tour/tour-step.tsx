import type { ViewInstance } from 'react-native';
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";

import {
  useTourContext,
  type TourPlacement,
  type TourShape,
  type TourStepEntry,
} from "@/src/components/ui/tour/types";

export type TourStepProps = Omit<ViewProps, "children"> & {
  /**
   * Where this step falls in the walkthrough. The author's numbering rather
   * than the tree's, and unique within a tour — two steps sharing an order
   * means one of them replaces the other.
   */
  order: number;
  /** The step's heading. */
  title?: string;
  /** The sentence under it. */
  description?: string;
  /** Shape of this step's cutout, overriding the tour's. */
  shape?: TourShape;
  /** Room around this target, overriding the tour's. */
  padding?: number;
  /** Corner radius of this cutout, overriding the tour's. */
  radius?: number;
  /** Which side of this target the card prefers, overriding the tour's. */
  placement?: TourPlacement;
  className?: string;
  /** The control this step is about. */
  children?: ReactNode;
};

/**
 * Wraps the control a step is about, and is what gets measured.
 *
 * The child is wrapped in a view rather than handed a ref, because the ref has
 * to survive whatever the child is — a button, a card, a tab bar — and only a
 * wrapper we own is guaranteed to be measurable. That wrapper is a plain view
 * with no sizing of its own, so it takes the width its parent gives it: put
 * layout classes on the step rather than on the child, the way you would on any
 * other view in that position.
 *
 * It renders its child and nothing else while the tour is closed, and stays
 * mounted either way — a step is a description of a control that is already on
 * the screen, not something that appears with the walkthrough.
 */
export const TourStep = ({
  order,
  title,
  description,
  shape,
  padding,
  radius,
  placement,
  className,
  children,
  ...props
}: TourStepProps) => {
  const { register, unregister } = useTourContext("Tour.Step");
  const target = useRef<ViewInstance>(null);

  // Memoized because it is the identity the effect below registers and
  // unregisters on — an unstable entry would re-register every render.
  const entry = useMemo<TourStepEntry>(
    () => ({
      order,
      title,
      description,
      shape,
      padding,
      radius,
      placement,
      target,
    }),
    [order, title, description, shape, padding, radius, placement],
  );

  useEffect(() => {
    register(entry);
    return () => unregister(entry);
  }, [entry, register, unregister]);

  return (
    <View ref={target} collapsable={false} className={className} {...props}>
      {children}
    </View>
  );
};

TourStep.displayName = "Tour.Step";
