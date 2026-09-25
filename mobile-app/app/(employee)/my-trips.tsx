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
  APPROVED:    { bg: '#052e16', text: '#4ade80', label: 'Approved' },
  REJECTED:    { bg: '#1c0a0a', text: '#f87171', label: 'Rejected' },
  IN_PROGRESS: { bg: '#0c1a2e', text: '#38bdf8', label: 'In Progress' },
  COMPLETED:   { bg: '#0a0a1a', text: '#818cf8', label: 'Completed' },
  CANCELLED:   { bg: '#1a1a1a', text: '#64748b', label: 'Cancelled' },
};

export default function MyTripsScreen() {
  const router = useRouter();
  const { user } = useMobileStore();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = useCallback(async () => {
    const res = await tripsApi.getMyTrips();
    if (res.success && res.data) setTrips(res.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const onRefresh = () => { setRefreshing(true); fetchTrips(); };

  const renderTrip = ({ item }: { item: any }) => {
    const s = STATUS_COLORS[item.status] || STATUS_COLORS.CANCELLED;
    const dept = new Date(item.departureAt);
    const fromLoc = item.fromOffice?.name || item.pickupAddress || 'Origin';
    const toLoc = item.toOffice?.name || item.dropoffAddress || 'Destination';
    const isCustom = !item.fromOfficeId || !item.toOfficeId;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.badge, { backgroundColor: s.bg }]}>
              <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
            </View>
            {isCustom && (
              <View style={[styles.badge, { backgroundColor: '#1e1b4b' }]}>
                <Text style={[styles.badgeText, { color: '#a5b4fc', fontSize: 10 }]}>📍 Custom Location</Text>
              </View>
            )}
          </View>
          <Text style={styles.date}>
            {dept.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.route}>
          <Text style={styles.routeFrom} numberOfLines={2}>📍 {fromLoc}</Text>
          <Text style={styles.routeArrow}>→</Text>
          <Text style={styles.routeTo} numberOfLines={2}>🏁 {toLoc}</Text>
        </View>

        <Text style={styles.purpose} numberOfLines={2}>{item.purpose}</Text>

        {/* Accompanying Passengers */}
        {item.passengers && item.passengers.length > 0 && (
          <View style={styles.passengerRow}>
            <Text style={styles.passengerLabel}>Colleagues:</Text>
            <View style={styles.passengerTags}>
              {item.passengers.map((p: any) => (
                <View key={p.id || p.employeeId || p.name} style={styles.passengerTag}>
                  <Text style={styles.passengerTagText}>
                    👤 {p.name}{p.employeeId ? ` (${p.employeeId})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {item.vehicle && (
          <View style={styles.assignedRow}>
            <Text style={styles.assignedLabel}>Vehicle:</Text>
            <Text style={styles.assignedValue}>
              {item.vehicle.make} {item.vehicle.model} · {item.vehicle.registrationNo}
            </Text>
          </View>
        )}
        {item.driver && (
          <View style={styles.assignedRow}>
            <Text style={styles.assignedLabel}>Driver:</Text>
            <Text style={styles.assignedValue}>{item.driver.user?.name}</Text>
          </View>
        )}

        <View style={styles.tripType}>
          <Text style={styles.tripTypeText}>
            {item.tripType === 'ROUND_TRIP' ? '🔄 Round Trip' : item.tripType === 'ONE_WAY' ? '➡️ One Way' : '🔁 Pickup & Drop-off'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader activeScreen="my-trips" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={styles.loadingText}>Loading trips...</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptyDesc}>Submit your first vehicle requisition</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(employee)/request-trip')}
          >
            <Text style={styles.emptyBtnText}>Request a Vehicle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={renderTrip}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
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
  screenSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  newBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
  purpose: { fontSize: 14, color: '#f8fafc', fontWeight: '500', lineHeight: 20 },
  passengerRow: { gap: 4 },
  passengerLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  passengerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  passengerTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passengerTagText: { fontSize: 11, color: '#94a3b8' },
  assignedRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  assignedLabel: { fontSize: 11, color: '#475569', fontWeight: '600', textTransform: 'uppercase' },
  assignedValue: { fontSize: 12, color: '#94a3b8' },
  tripType: { borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 8 },
  tripTypeText: { fontSize: 11, color: '#475569' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#475569', fontSize: 13, marginTop: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  emptyDesc: { fontSize: 13, color: '#64748b' },
  emptyBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
