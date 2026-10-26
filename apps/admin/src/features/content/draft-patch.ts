/**
 * The draft left after a save of `submitted` lands: only the fields edited while
 * the save was in flight. Editors keep typing during a save, and clearing the
 * whole draft would drop what was never sent. `setField` stores a new value per
 * edit, so a field still holding the submitted value wasn't touched since.
 */
export function unsavedSince<T extends object>(
	current: T,
	submitted: T
): Partial<T> {
	return Object.fromEntries(
		Object.entries(current).filter(
			([key, value]) => submitted[key as keyof T] !== value
		)
	) as Partial<T>;
}
