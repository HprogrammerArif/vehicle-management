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
import { useRouter } from 'expo-router';
import { tripsApi } from '../../src/services/api';
import { useMobileStore } from '../../src/store/useMobileStore';
import { AppHeader } from '../../src/components/AppHeader';

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:     { bg: '#1c1917', text: '#f59e0b', label: 'Pending Review' },
  APPROVED:    { bg: '#052e16', text: '#4ade80', label: 'Assigned / Ready' },
  IN_PROGRESS: { bg: '#0c1a2e', text: '#38bdf8', label: 'In Progress 🚀' },
  COMPLETED:   { bg: '#0a0a1a', text: '#818cf8', label: 'Completed 🏁' },
  CANCELLED:   { bg: '#1a1a1a', text: '#64748b', label: 'Cancelled' },
};

export default function DriverTripsScreen() {
  const router = useRouter();
  const { user } = useMobileStore();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const fetchTrips = useCallback(async () => {
    try {
      const res = await tripsApi.getMyTrips();
      if (res.success && res.data) {
        setTrips(res.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const filteredTrips = trips.filter((t) => {
    if (filter === 'ASSIGNED') return t.status === 'APPROVED';
    if (filter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (filter === 'COMPLETED') return t.status === 'COMPLETED';
    return true;
  });

  const renderTrip = ({ item }: { item: any }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.CANCELLED;
    const dept = new Date(item.departureAt);
    const fromLoc = item.fromOffice?.name || item.pickupAddress || 'Origin';
    const toLoc = item.toOffice?.name || item.dropoffAddress || 'Destination';
    const isCustom = !item.fromOfficeId || !item.toOfficeId;
    const isActionable = item.status === 'APPROVED' || item.status === 'IN_PROGRESS';

    return (
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.badge, { backgroundColor: s.bg }]}>
              <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
            </View>
            {isCustom && (
              <View style={[styles.badge, { backgroundColor: '#1e1b4b' }]}>
                <Text style={[styles.badgeText, { color: '#a5b4fc', fontSize: 10 }]}>
                  📍 Custom Location
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.date}>
            {dept.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        {/* Route */}
        <View style={styles.route}>
          <Text style={styles.routeFrom} numberOfLines={2}>
            📍 {fromLoc}
          </Text>
          <Text style={styles.routeArrow}>→</Text>
          <Text style={styles.routeTo} numberOfLines={2}>
            🏁 {toLoc}
          </Text>
        </View>

        {/* Purpose */}
        <Text style={styles.purpose} numberOfLines={2}>
          "{item.purpose}"
        </Text>

        {/* Vehicle Info */}
        {item.vehicle && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Assigned Vehicle:</Text>
            <Text style={styles.detailValue}>
              🚗 {item.vehicle.make} {item.vehicle.model} ({item.vehicle.registrationNo})
            </Text>
          </View>
        )}

        {/* Requester */}
        {item.requester && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Passenger / Dept:</Text>
            <Text style={styles.detailValue}>
              👤 {item.requester.name} {item.requester.phone ? `(${item.requester.phone})` : ''}
            </Text>
          </View>
        )}

        {/* Colleagues */}
        {item.passengers && item.passengers.length > 0 && (
          <View style={styles.passengerRow}>
            <Text style={styles.detailLabel}>Accompanying Colleagues:</Text>
            <View style={styles.passengerTags}>
              {item.passengers.map((p: any) => (
                <View key={p.id || p.employeeId || p.name} style={styles.passengerTag}>
                  <Text style={styles.passengerTagText}>
                    👤 {p.name} {p.employeeId ? `(${p.employeeId})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Completed distance info */}
        {item.status === 'COMPLETED' && item.distanceCovered && (
          <View style={styles.distanceBox}>
            <Text style={styles.distanceText}>
              🏁 Trip Distance: {item.distanceCovered} km (Odo: {item.startOdometer} → {item.endOdometer})
            </Text>
          </View>
        )}

        {/* Action Button for Active / Upcoming Trips */}
        {isActionable && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(driver)/active-trip')}
          >
            <Text style={styles.actionBtnText}>
              {item.status === 'IN_PROGRESS' ? '📡 Return to Live GPS Console' : '🚀 Open Duty Console'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader activeScreen="my-trips" />

      {/* Filter Tabs */}
      <View style={styles.filterStrip}>
        {(['ALL', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterBtn, filter === tab && styles.filterBtnActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterBtnText, filter === tab && styles.filterBtnTextActive]}>
              {tab === 'ALL'
                ? `All (${trips.length})`
                : tab === 'ASSIGNED'
                ? 'Assigned'
                : tab === 'IN_PROGRESS'
                ? 'In Progress'
                : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={styles.loadingText}>Loading assigned trips…</Text>
        </View>
      ) : filteredTrips.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>No trips in this view</Text>
          <Text style={styles.emptyDesc}>
            {filter === 'ALL'
              ? 'No trips dispatched to your driver account yet.'
              : `No ${filter.toLowerCase().replace('_', ' ')} trips found.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
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
  filterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  filterBtnActive: {
    backgroundColor: '#4f46e5',
  },
  filterBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 11, color: '#475569' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeFrom: { fontSize: 13, color: '#94a3b8', flex: 1 },
  routeArrow: { fontSize: 12, color: '#334155' },
  routeTo: { fontSize: 13, color: '#94a3b8', flex: 1, textAlign: 'right' },
  purpose: { fontSize: 13, color: '#f8fafc', fontWeight: '500', lineHeight: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { fontSize: 12, color: '#cbd5e1', fontWeight: '600' },
  passengerRow: { gap: 4 },
  passengerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  passengerTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passengerTagText: { fontSize: 11, color: '#94a3b8' },
  distanceBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    padding: 8,
    borderRadius: 8,
  },
  distanceText: { color: '#a5b4fc', fontSize: 11, fontWeight: '600' },
  actionBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  loadingText: { color: '#475569', fontSize: 13, marginTop: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  emptyDesc: { fontSize: 13, color: '#64748b', textAlign: 'center' },
});
