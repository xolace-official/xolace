import { useLocalSearchParams } from 'expo-router';
import { XolacerProfileScreen } from '@/src/features/xolacer-chat/components/xolacer-profile-screen';

export default function XolacerProfileRoute() {
  // `specialty` is optional context for the "others listen to this too" exit —
  // anyone can arrive with it by filtering the roster themselves, so it says
  // nothing about how this profile was reached.
  // `stepId` is the kindling twig that led here, tended once a request is sent.
  const { profileId, specialty, stepId } = useLocalSearchParams<{
    profileId: string;
    specialty?: string;
    stepId?: string;
  }>();
  return <XolacerProfileScreen profileId={profileId} specialty={specialty} stepId={stepId} />;
}
