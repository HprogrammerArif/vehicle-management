import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useMobileStore } from '../src/store/useMobileStore';
import { getMobileSocket } from '../src/services/socket';
import { ToastProvider, useToast } from '../src/components/AppToast';
import { AlertModalProvider } from '../src/components/AppAlert';

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

import { notificationsApi } from '../src/services/api';

function NotificationListener() {
  const { user, setUnreadNotifCount } = useMobileStore();
  const { showToast } = useToast();

  useEffect(() => {
    const socket = getMobileSocket();

    const registerOnline = () => {
      const u = useMobileStore.getState().user;
      if (u?.id) {
        socket.emit('user:online', {
          userId: u.id,
          name: u.name,
          role: u.role,
        });
      }
    };

    registerOnline();
    socket.on('connect', registerOnline);

    if (user?.id) {
      notificationsApi.getMyNotifications().then((res) => {
        if (res.success && typeof res.unreadCount === 'number') {
          setUnreadNotifCount(res.unreadCount);
        }
      }).catch(() => {});
    }

    const handleNewNotification = (data: any) => {
      const u = useMobileStore.getState().user;
      // Check if this notification is targeted at current user
      const isTargeted =
        !data.recipientUserIds ||
        data.recipientUserIds.length === 0 ||
        (u?.id && data.recipientUserIds.includes(u.id)) ||
        (u?.driverId && data.recipientUserIds.includes(u.driverId)) ||
        (u?.employeeId &&
          data.recipientUserIds.some(
            (id: string) => typeof id === 'string' && id.toLowerCase() === u.employeeId?.toLowerCase()
          ));

      if (isTargeted) {
        useMobileStore.getState().setUnreadNotifCount(useMobileStore.getState().unreadNotifCount + 1);
        if (data.title) {
          showToast({ type: 'info', title: data.title, message: data.body });
        }
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('connect', registerOnline);
      socket.off('notification:new', handleNewNotification);
    };
  }, [user?.id, setUnreadNotifCount, showToast]);

  return null;
}

export default function RootLayout() {
  const { initAuth } = useMobileStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <KeyboardProvider>
      <ToastProvider>
        <AlertModalProvider>
          <StatusBar style="dark" />
          <AuthGuard />
          <NotificationListener />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#ffffff' },
              headerTintColor: '#171717',
              headerTitleStyle: { fontWeight: '700', fontSize: 17 },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: '#F8FAFC' },
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
            <Stack.Screen name="(driver)/leave" options={{ headerShown: false }} />
          </Stack>
        </AlertModalProvider>
      </ToastProvider>
    </KeyboardProvider>
  );
}
