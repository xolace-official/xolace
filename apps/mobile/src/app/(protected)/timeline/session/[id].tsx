import { Stack } from "expo-router";
import { SessionDetailsScreen } from "@/src/features/timeline/components/screens/SessionDetailsScreen";

const NO_HEADER = { headerShown: false };

const SessionDetails = () => {
  return (
    <>
      <Stack.Screen options={NO_HEADER} />
      <SessionDetailsScreen />
    </>
  );
};

export default SessionDetails;
