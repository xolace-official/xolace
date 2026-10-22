import { useLocalSearchParams } from 'expo-router';
import { LibraryListScreen } from '@/src/features/library/home/library-list-screen';

export default function LibrarySubjectRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return <LibraryListScreen by={{ subject: slug }} />;
}
