import { Children, isValidElement, type ReactNode } from 'react';
import type { Slot } from './context';

export interface Parts {
  cells: ReactNode[];
  rules: ReactNode[];
  x: ReactNode | null;
  y: React.ReactElement<{ width?: number }> | null;
  tooltip: ReactNode[];
  legend: ReactNode[];
  header: ReactNode[];
  columns: number;
}

/** Sorts the children into the places the layout has for them. */
export function splitParts(children: ReactNode): Parts {
  const parts: Parts = {
    cells: [],
    rules: [],
    x: null,
    y: null,
    tooltip: [],
    legend: [],
    header: [],
    columns: 0,
  };

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child)) return;
    const slot = (child.type as { slot?: Slot }).slot ?? 'cells';
    // Children are a static composition list, so position is their identity.
    // eslint-disable-next-line react/no-array-index-key
    const keyed = <ChildSlot key={index}>{child}</ChildSlot>;

    if (slot === 'x-axis') parts.x = keyed;
    else if (slot === 'y-axis') parts.y = child as React.ReactElement<{ width?: number }>;
    else if (slot === 'rules') parts.rules.push(keyed);
    else if (slot === 'tooltip') parts.tooltip.push(keyed);
    else if (slot === 'legend') parts.legend.push(keyed);
    else if (slot === 'header') parts.header.push(keyed);
    else parts.cells.push(keyed);
  });

  return parts;
}

/** Identity wrapper, purely so the partitioned arrays can carry keys. */
function ChildSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
