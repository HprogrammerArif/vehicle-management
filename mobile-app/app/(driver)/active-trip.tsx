import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { tripsApi } from '../../src/services/api';
import { getMobileSocket } from '../../src/services/socket';
import { useMobileStore } from '../../src/store/useMobileStore';
import { AppHeader } from '../../src/components/AppHeader';

export default function ActiveTripScreen() {
  const router = useRouter();
  const { user } = useMobileStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; speed?: number } | null>(null);

  // Complete Trip modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [endOdometer, setEndOdometer] = useState('');
  const [completing, setCompleting] = useState(false);

  const fetchActiveTrip = useCallback(async () => {
    try {
      const res = await tripsApi.getMyTrips();
      if (res.success && res.data) {
        // Find first in-progress or approved trip
        const current = res.data.find(
          (t: any) => t.status === 'IN_PROGRESS' || t.status === 'APPROVED'
        );
        setActiveTrip(current || null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveTrip();
    return () => {
      if (locationWatcher) locationWatcher.remove();
    };
  }, [fetchActiveTrip]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveTrip();
  };

  const startJourney = async () => {
    if (!activeTrip) return;

    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('Permission Denied', 'GPS location permission is needed to stream telemetry.');
      return;
    }

    // Call API to start trip if not yet in progress
    if (activeTrip.status !== 'IN_PROGRESS') {
      const res = await tripsApi.startTrip(activeTrip.id);
      if (!res.success) {
        Alert.alert('Error', res.message || 'Failed to start trip.');
        return;
      }
    }

    setActiveTrip((prev: any) => ({ ...prev, status: 'IN_PROGRESS' }));

    // Start live GPS tracking watcher
    const watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 10,
      },
      (loc) => {
        const currentCoords = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          speed: loc.coords.speed && loc.coords.speed > 0 ? loc.coords.speed * 3.6 : 45,
        };
        setCoords(currentCoords);

        const socket = getMobileSocket();
        socket.emit('location:update', {
          tripId: activeTrip.id,
          vehicleId: activeTrip.vehicleId || activeTrip.vehicle?.id,
          driverId: user?.driverId || activeTrip.driverId,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          speed: currentCoords.speed,
          heading: loc.coords.heading || 0,
        });
      }
    );
    setLocationWatcher(watcher);

    Alert.alert('Journey Commenced', 'Live GPS coordinates are now streaming to the central Fleet map.');
  };

  const handleCompleteSubmit = async () => {
    if (!activeTrip) return;
    const odoNum = parseFloat(endOdometer);
    if (isNaN(odoNum) || odoNum <= 0) {
      Alert.alert('Required', 'Please enter a valid ending odometer reading.');
      return;
    }

    setCompleting(true);
    if (locationWatcher) {
      locationWatcher.remove();
      setLocationWatcher(null);
    }

    const socket = getMobileSocket();
    socket.emit('trip:status_change', {
      tripId: activeTrip.id,
      status: 'COMPLETED',
    });

    const res = await tripsApi.completeTrip(activeTrip.id, odoNum);
    setCompleting(false);
    setShowCompleteModal(false);

    if (res.success) {
      Alert.alert('Mission Accomplished', 'Trip finalized. Vehicle and driver status updated to Available.');
      setActiveTrip(null);
      fetchActiveTrip();
    } else {
      Alert.alert('Error', res.message || 'Failed to complete trip.');
    }
  };

  const fromLocation =
    activeTrip?.fromOffice?.name || activeTrip?.pickupAddress || 'Origin';
  const toLocation =
    activeTrip?.toOffice?.name || activeTrip?.dropoffAddress || 'Destination';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" size="large" />
        <Text style={styles.loadingText}>Checking active assignments…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader activeScreen="active-trip" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {!activeTrip ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>Standby Status: Available</Text>
          <Text style={styles.emptyDesc}>
            No active trips currently dispatched to your duty board. Pull down to refresh when admin assigns a vehicle.
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>🔄 Check Assignments</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <Text
              style={[
                styles.statusBadge,
                activeTrip.status === 'IN_PROGRESS' && styles.statusBadgeActive,
              ]}
            >
              {activeTrip.status === 'IN_PROGRESS' ? '● IN TRANSIT' : '● ASSIGNED & READY'}
            </Text>
            <Text style={styles.plateText}>
              {activeTrip.vehicle?.registrationNo || 'NO-PLATE'}
            </Text>
          </View>

          <Text style={styles.vehicleTitle}>
            {activeTrip.vehicle?.make} {activeTrip.vehicle?.model || 'Assigned Vehicle'}
          </Text>

          {/* Route Section */}
          <View style={styles.routeBox}>
            <View style={styles.routePoint}>
              <Text style={styles.routeIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.routePointLabel}>PICKUP</Text>
                <Text style={styles.routePointName}>{fromLocation}</Text>
              </View>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routePoint}>
              <Text style={styles.routeIcon}>🏁</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.routePointLabel}>DESTINATION</Text>
                <Text style={styles.routePointName}>{toLocation}</Text>
              </View>
            </View>
          </View>

          {/* Purpose & Passengers */}
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>PURPOSE</Text>
            <Text style={styles.metaValue}>"{activeTrip.purpose}"</Text>

            {activeTrip.passengers && activeTrip.passengers.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.metaLabel}>PASSENGERS ({activeTrip.passengers.length})</Text>
                <View style={styles.passengerTags}>
                  {activeTrip.passengers.map((p: any) => (
                    <View key={p.id || p.employeeId || p.name} style={styles.passengerTag}>
                      <Text style={styles.passengerTagText}>
                        👤 {p.name}{p.employeeId ? ` (${p.employeeId})` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Live Telemetry Box */}
          <View style={styles.telemetryBox}>
            <Text style={styles.telemetryLabel}>GPS Telemetry Gateway</Text>
            <Text style={styles.telemetryValue}>
              {coords
                ? `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)} · Speed: ${Math.round(coords.speed || 0)} km/h`
                : activeTrip.status === 'IN_PROGRESS'
                ? 'Acquiring GPS fix…'
                : 'GPS Standby (Ready to activate)'}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {activeTrip.status !== 'IN_PROGRESS' && (
              <TouchableOpacity style={styles.primaryButton} onPress={startJourney}>
                <Text style={styles.buttonText}>🚀 Start Journey (Activate GPS)</Text>
              </TouchableOpacity>
            )}

            {activeTrip.status === 'IN_PROGRESS' && (
              <>
                <TouchableOpacity
                  style={styles.fuelButton}
                  onPress={() => router.push('/(driver)/fuel-log')}
                >
                  <Text style={styles.fuelButtonText}>⛽ Log Fuel Purchase</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => setShowCompleteModal(true)}
                >
                  <Text style={styles.buttonText}>🏁 Complete Journey</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push('/(driver)/conversations')}
            >
              <Text style={styles.chatButtonText}>💬 Dispatch &amp; Passenger Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Complete Trip Modal */}
      <Modal visible={showCompleteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Finalize Trip</Text>
            <Text style={styles.modalSubtitle}>
              Enter the vehicle's odometer reading upon arrival at {toLocation}.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Ending Odometer (km)"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={endOdometer}
              onChangeText={setEndOdometer}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, completing && { opacity: 0.6 }]}
                onPress={handleCompleteSubmit}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 13 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverName: { fontSize: 22, fontWeight: '800', color: '#f8fafc' },
  headerSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 20,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  emptyDesc: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  refreshBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  refreshBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 14,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeActive: {
    color: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  plateText: {
    fontFamily: 'monospace',
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  routeBox: {
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 10,
  },
  routePoint: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  routeIcon: { fontSize: 16, marginTop: 1 },
  routePointLabel: { fontSize: 9, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  routePointName: { fontSize: 13, fontWeight: '600', color: '#f1f5f9', marginTop: 2 },
  routeDivider: { height: 1, backgroundColor: '#0f172a', marginLeft: 26 },
  metaBox: { gap: 4 },
  metaLabel: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase' },
  metaValue: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  passengerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  passengerTag: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passengerTagText: { fontSize: 11, color: '#94a3b8' },
  telemetryBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
  },
  telemetryLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  telemetryValue: { fontSize: 12, color: '#38bdf8', fontFamily: 'monospace', marginTop: 4 },
  actions: { gap: 10, marginTop: 6 },
  primaryButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  fuelButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  fuelButtonText: { color: '#f59e0b', fontWeight: '700', fontSize: 14 },
  completeButton: {
    backgroundColor: '#9333ea',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  chatButton: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  chatButtonText: { color: '#38bdf8', fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  modalSubtitle: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
  modalInput: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: '#94a3b8', fontWeight: '600' },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: '#9333ea',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#fff', fontWeight: '700' },
});
