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

import { statusColors, colors } from '../../src/theme/colors';

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
    const s = statusColors[item.status] || statusColors.CANCELLED;
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
            <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
            </View>
            {isCustom && (
              <View style={[styles.badge, { backgroundColor: '#EFF6FF', borderColor: '#BEDBFF', borderWidth: 1 }]}>
                <Text style={[styles.badgeText, { color: '#2B7FFF', fontSize: 10 }]}>
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
          <ActivityIndicator color={colors.primary} size="large" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  filterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterBtnActive: {
    backgroundColor: '#2B7FFF',
    borderColor: '#2B7FFF',
  },
  filterBtnText: {
    color: '#525252',
    fontSize: 11,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 11, color: '#878787', fontWeight: '500' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeFrom: { fontSize: 13, color: '#171717', fontWeight: '600', flex: 1 },
  routeArrow: { fontSize: 12, color: '#2B7FFF', fontWeight: '700' },
  routeTo: { fontSize: 13, color: '#171717', fontWeight: '600', flex: 1, textAlign: 'right' },
  purpose: { fontSize: 13, color: '#262626', fontWeight: '500', lineHeight: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 10, color: '#878787', fontWeight: '700', textTransform: 'uppercase' },
  detailValue: { fontSize: 12, color: '#171717', fontWeight: '600' },
  passengerRow: { gap: 4 },
  passengerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  passengerTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passengerTagText: { fontSize: 11, color: '#525252' },
  distanceBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BEDBFF',
    padding: 8,
    borderRadius: 8,
  },
  distanceText: { color: '#2B7FFF', fontSize: 11, fontWeight: '700' },
  actionBtn: {
    backgroundColor: '#2B7FFF',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20 },
  loadingText: { color: '#878787', fontSize: 13, marginTop: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#171717' },
  emptyDesc: { fontSize: 13, color: '#525252', textAlign: 'center' },
});
