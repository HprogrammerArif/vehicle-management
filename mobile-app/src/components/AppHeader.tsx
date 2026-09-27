import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  MessageSquare,
  LogOut,
  Zap,
  ClipboardList,
  Fuel,
  Plus,
} from 'lucide-react-native';
import { useMobileStore } from '../store/useMobileStore';
import { getMobileSocket } from '../services/socket';
import { useAppAlert } from './AppAlert';

interface AppHeaderProps {
  title?: string;
  activeScreen?: 'my-trips' | 'request-trip' | 'active-trip' | 'fuel-log' | 'notifications' | 'chat';
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, activeScreen }) => {
  const router = useRouter();
  const { user, logout, unreadNotifCount, unreadChatCount } = useMobileStore();
  const { showConfirm } = useAppAlert();

  const handleLogout = () => {
    showConfirm({
      title: 'Sign Out',
      message: `Sign out from ${user?.name || 'account'} (${user?.employeeId || user?.role})?`,
      type: 'danger',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onConfirm: async () => {
        const socket = getMobileSocket();
        if (user?.id) {
          socket.emit('user:offline', { userId: user.id });
        }
        await logout();
        router.replace('/');
      },
    });
  };

  const isDriver = user?.role === 'DRIVER';

  return (
    <View style={styles.wrapper}>
      {/* Top Profile & Actions Row */}
      {/* Top Profile & Actions Row */}
      <View style={styles.topRow}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.userTextCol}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                {user?.name || (isDriver ? 'Driver' : 'Employee')}
              </Text>
              {user?.employeeId && (
                <View style={styles.idBadge}>
                  <Text style={styles.idBadgeText}>{user.employeeId}</Text>
                </View>
              )}
            </View>
            <Text style={styles.userRole} numberOfLines={1} ellipsizeMode="tail">
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
            <Bell size={18} color="#2B7FFF" />
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
            <MessageSquare size={18} color="#2B7FFF" />
            {unreadChatCount > 0 && (
              <View style={styles.chatBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sign Out */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            accessibilityLabel="Sign Out"
          >
            <LogOut size={16} color="#F14141" />
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
              <Zap
                size={13}
                color={activeScreen === 'active-trip' ? '#ffffff' : '#525252'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'active-trip' && styles.navTabTextActive,
                ]}
              >
                Active Mission
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'my-trips' && styles.navTabActive]}
              onPress={() => router.replace('/(driver)/my-trips')}
            >
              <ClipboardList
                size={13}
                color={activeScreen === 'my-trips' ? '#ffffff' : '#525252'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'my-trips' && styles.navTabTextActive,
                ]}
              >
                Assignments
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'fuel-log' && styles.navTabActive]}
              onPress={() => router.push('/(driver)/fuel-log')}
            >
              <Fuel
                size={13}
                color={activeScreen === 'fuel-log' ? '#ffffff' : '#525252'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'fuel-log' && styles.navTabTextActive,
                ]}
              >
                Fuel Log
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'my-trips' && styles.navTabActive]}
              onPress={() => router.replace('/(employee)/my-trips')}
            >
              <ClipboardList
                size={13}
                color={activeScreen === 'my-trips' ? '#ffffff' : '#525252'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'my-trips' && styles.navTabTextActive,
                ]}
              >
                My Requisitions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'request-trip' && styles.navTabActive]}
              onPress={() => router.push('/(employee)/request-trip')}
            >
              <Plus
                size={13}
                color={activeScreen === 'request-trip' ? '#ffffff' : '#525252'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'request-trip' && styles.navTabTextActive,
                ]}
              >
                New Request
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navTab, activeScreen === 'notifications' && styles.navTabActive]}
              onPress={() => router.push('/(employee)/notifications')}
            >
              <Bell
                size={13}
                color={activeScreen === 'notifications' ? '#ffffff' : '#525252'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.navTabText,
                  activeScreen === 'notifications' && styles.navTabTextActive,
                ]}
              >
                Alerts
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
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
    minWidth: 0,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#2B7FFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  userTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: '#171717',
    fontWeight: '800',
    fontSize: 14,
    flexShrink: 1,
  },
  idBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BEDBFF',
    flexShrink: 0,
  },
  idBadgeText: {
    color: '#2B7FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  userRole: {
    color: '#525252',
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 0,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BEDBFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#2B7FFF',
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 2,
  },
  screenTitle: {
    color: '#171717',
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
    borderTopColor: '#F1F5F9',
    marginTop: 6,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  navTabActive: {
    backgroundColor: '#2B7FFF',
    borderColor: '#2B7FFF',
  },
  navTabText: {
    color: '#525252',
    fontSize: 11,
    fontWeight: '600',
  },
  navTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
