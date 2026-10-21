import { Stack } from "expo-router";


const SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: 'transparent' },
};

export default function PaywallLayout() {
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen
        name="upgrade"
        options={{
          title: "",
          headerTransparent: true,
          headerShadowVisible: false,
          presentation: "fullScreenModal",
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
