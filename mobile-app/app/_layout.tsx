import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useMobileStore } from '../src/store/useMobileStore';
import { getMobileSocket } from '../src/services/socket';

function AuthGuard() {
  const { user, token, isInitialized } = useMobileStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const isAuthScreen = segments[0] === undefined || segments[0] === 'index';
    const isLoggedIn = !!(user && token);

    if (!isLoggedIn && !isAuthScreen) {
      // Not logged in and trying to access protected route → go to login
      router.replace('/');
    } else if (isLoggedIn && isAuthScreen) {
      // Already logged in on login screen → redirect to role home
      if (user.role === 'DRIVER') {
        router.replace('/(driver)/active-trip');
      } else {
        router.replace('/(employee)/my-trips');
      }
    }
  }, [user, token, isInitialized, segments, router]);

  return null;
}

export default function RootLayout() {
  const { initAuth, user, unreadNotifCount, setUnreadNotifCount } = useMobileStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Global socket listener for live notifications
  useEffect(() => {
    const socket = getMobileSocket();

    if (user?.id) {
      socket.emit('user:online', {
        userId: user.id,
        name: user.name,
        role: user.role,
      });
    }

    const handleNewNotification = (data: any) => {
      // Check if this notification is targeted at current user
      const isTargeted =
        !data.recipientUserIds ||
        data.recipientUserIds.length === 0 ||
        (user?.id && data.recipientUserIds.includes(user.id));

      if (isTargeted) {
        setUnreadNotifCount(unreadNotifCount + 1);
        if (data.title && data.body) {
          Alert.alert(data.title, data.body);
        }
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [user?.id, unreadNotifCount, setUnreadNotifCount]);

  return (
    <>
      <StatusBar style="light" />
      <AuthGuard />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#020617' },
        }}
      >
        {/* Auth */}
        <Stack.Screen name="index" options={{ title: 'Apex VMS', headerShown: false }} />

        {/* Employee Screens */}
        <Stack.Screen name="(employee)/my-trips" options={{ title: 'My Requisitions' }} />
        <Stack.Screen name="(employee)/request-trip" options={{ title: 'New Trip Request' }} />
        <Stack.Screen name="(employee)/notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="(employee)/conversations" options={{ title: 'Support & Dispatch Chat' }} />
        <Stack.Screen name="(employee)/chat/[id]" options={{ headerShown: false }} />

        {/* Driver Screens */}
        <Stack.Screen name="(driver)/active-trip" options={{ title: 'Active Mission' }} />
        <Stack.Screen name="(driver)/my-trips" options={{ title: 'My Assigned Trips' }} />
        <Stack.Screen name="(driver)/fuel-log" options={{ title: 'Submit Fuel Receipt' }} />
        <Stack.Screen name="(driver)/notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="(driver)/conversations" options={{ title: 'Fleet Dispatch Chat' }} />
        <Stack.Screen name="(driver)/chat/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
