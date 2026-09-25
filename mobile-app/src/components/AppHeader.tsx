import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileStore } from '../store/useMobileStore';
import { getMobileSocket } from '../services/socket';

interface AppHeaderProps {
  title?: string;
  activeScreen?: 'my-trips' | 'request-trip' | 'active-trip' | 'fuel-log' | 'notifications' | 'chat';
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, activeScreen }) => {
  const router = useRouter();
  const { user, logout, unreadNotifCount, unreadChatCount } = useMobileStore();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      `Sign out from ${user?.name || 'account'} (${user?.employeeId || user?.role})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const socket = getMobileSocket();
            if (user?.id) {
              socket.emit('user:offline', { userId: user.id });
            }
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const isDriver = user?.role === 'DRIVER';

  return (
    <View style={styles.wrapper}>
      {/* Top Profile & Actions Row */}
      <View style={styles.topRow}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || (isDriver ? 'Driver' : 'Employee')}
              </Text>
              {user?.employeeId && (
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>{user.employeeId}</Text>
                </View>
              )}
            </View>
            <Text style={styles.userRole}>
              {isDriver ? 'Fleet Driver · Active Duty' : user?.department || 'Corporate Employee'}
            </Text>
          </View>
        </View>

        {/* Right Action Icons: Notif, Chat, Logout */}
        <View style={styles.actions}>
          {/* Notifications button */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              router.push(isDriver ? '/(driver)/notifications' : '/(employee)/notifications')
            }
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
            {unreadNotifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Chat button */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              router.push(isDriver ? '/(driver)/conversations' : '/(employee)/conversations')
            }
          >
            <Text style={{ fontSize: 16 }}>💬</Text>
            {unreadChatCount > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sign Out */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Title (if provided) */}
      {title && (
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>{title}</Text>
        </View>
      )}

      {/* Quick Role Navigation Strip */}
      <View style={styles.navStrip}>
        {isDriver ? (
          <>
            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'active-trip' && styles.navTabActive]}
              onPress={() => router.replace('/(driver)/active-trip')}
            >
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'active-trip' && styles.navTabTextActive,
                ]}
              >
                🚀 Active Mission
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'my-trips' && styles.navTabActive]}
              onPress={() => router.replace('/(driver)/my-trips')}
            >
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'my-trips' && styles.navTabTextActive,
                ]}
              >
                📋 Assignments
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'fuel-log' && styles.navTabActive]}
              onPress={() => router.push('/(driver)/fuel-log')}
            >
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'fuel-log' && styles.navTabTextActive,
                ]}
              >
                ⛽ Fuel Log
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'my-trips' && styles.navTabActive]}
              onPress={() => router.replace('/(employee)/my-trips')}
            >
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'my-trips' && styles.navTabTextActive,
                ]}
              >
                📋 My Requisitions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'request-trip' && styles.navTabActive]}
              onPress={() => router.push('/(employee)/request-trip')}
            >
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'request-trip' && styles.navTabTextActive,
                ]}
              >
                + New Request
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'notifications' && styles.navTabActive]}
              onPress={() => router.push('/(employee)/notifications')}
            >
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'notifications' && styles.navTabTextActive,
                ]}
              >
                🔔 Alerts
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingTop: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 14,
    maxWidth: 140,
  },
  idBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  idBadgeText: {
    color: '#a5b4fc',
    fontSize: 10,
    fontWeight: '800',
  },
  userRole: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  chatBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  screenTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  navStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 6,
  },
  navTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  navTabActive: {
    backgroundColor: '#4f46e5',
  },
  navTabText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  navTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
