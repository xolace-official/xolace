import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of `value` that updates only after `delay` milliseconds of no changes.
 *
 * @param value - The input value to debounce.
 * @param delay - Time in milliseconds to wait after the last change before updating.
 * @returns The latest `value` after it has remained unchanged for `delay` milliseconds.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
