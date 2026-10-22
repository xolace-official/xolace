import { Redirect, useLocalSearchParams } from 'expo-router';
import { KINDS } from '@/src/features/library/home/library-copy';
import { LibraryListScreen } from '@/src/features/library/home/library-list-screen';

export default function LibraryKindRoute() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const known = KINDS.find((k) => k.kind === kind);
  // A mistyped deep link lands on the home rather than an argument error.
  if (!known) return <Redirect href="/browse/library" />;
  return <LibraryListScreen by={{ kind: known.kind }} />;
}
