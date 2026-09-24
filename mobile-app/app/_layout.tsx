import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Apex VMS Mobile' }} />
        <Stack.Screen name="(employee)/request-trip" options={{ title: 'New Trip Request' }} />
        <Stack.Screen name="(employee)/conversations" options={{ title: 'Support & Dispatch Chat' }} />
        <Stack.Screen name="(employee)/chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="(driver)/active-trip" options={{ title: 'Active Mission GPS' }} />
        <Stack.Screen name="(driver)/fuel-log" options={{ title: 'Submit Fuel Receipt' }} />
        <Stack.Screen name="(driver)/conversations" options={{ title: 'Fleet Dispatch Chat' }} />
        <Stack.Screen name="(driver)/chat/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
