import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { notificationsApi } from '../../src/services/api';
import { useMobileStore } from '../../src/store/useMobileStore';

const TYPE_ICON: Record<string, string> = {
  TRIP_APPROVED:  '✅',
  TRIP_REJECTED:  '❌',
  TRIP_ASSIGNED:  '🚗',
  TRIP_STARTED:   '🚀',
  TRIP_COMPLETED: '🏁',
  FUEL_ANOMALY:   '⛽',
  MAINTENANCE:    '🔧',
  GENERAL:        '📢',
};

export default function NotificationsScreen() {
  const { setUnreadNotifCount } = useMobileStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const res = await notificationsApi.getMyNotifications();
    if (res.success && res.data) {
      setNotifications(res.data);
      setUnreadNotifCount(res.unreadCount || 0);
    }
    setLoading(false);
    setRefreshing(false);
  }, [setUnreadNotifCount]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotifCount(0);
  };

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    const remaining = notifications.filter((n) => n.id !== id && !n.isRead).length;
    setUnreadNotifCount(remaining);
  };

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => !item.isRead && handleMarkRead(item.id)}
      activeOpacity={0.85}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{TYPE_ICON[item.type] || '📢'}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleString('en-GB', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6366f1" size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyDesc}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  screenTitle: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  unreadCount: { fontSize: 12, color: '#f59e0b', marginTop: 2 },
  markAllBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markAllText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  cardUnread: {
    borderColor: '#312e81',
    backgroundColor: '#0e0c2e',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: { fontSize: 18 },
  content: { flex: 1, gap: 3 },
  title: { fontSize: 14, fontWeight: '700', color: '#f8fafc' },
  body: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
  time: { fontSize: 11, color: '#475569', marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#818cf8',
    marginTop: 4,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  emptyDesc: { fontSize: 13, color: '#64748b' },
});
