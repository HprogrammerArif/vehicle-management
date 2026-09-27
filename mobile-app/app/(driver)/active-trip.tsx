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
import { colors } from '../../src/theme/colors';

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
        <ActivityIndicator color={colors.primary} size="large" />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
              placeholderTextColor={colors.textMuted}
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', gap: 12 },
  loadingText: { color: '#878787', fontSize: 13 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverName: { fontSize: 22, fontWeight: '800', color: '#171717' },
  headerSubtitle: { fontSize: 12, color: '#525252', marginTop: 2 },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    elevation: 2,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#171717' },
  emptyDesc: { fontSize: 13, color: '#525252', textAlign: 'center', lineHeight: 20 },
  refreshBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BEDBFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  refreshBtnText: { color: '#2B7FFF', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C6',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeActive: {
    color: '#2F9B65',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  plateText: {
    fontFamily: 'monospace',
    color: '#2B7FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleTitle: { fontSize: 18, fontWeight: '800', color: '#171717' },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  routePoint: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  routeIcon: { fontSize: 16, marginTop: 1 },
  routePointLabel: { fontSize: 9, fontWeight: '800', color: '#525252', textTransform: 'uppercase' },
  routePointName: { fontSize: 13, fontWeight: '600', color: '#171717', marginTop: 2 },
  routeDivider: { height: 1, backgroundColor: '#E2E8F0', marginLeft: 26 },
  metaBox: { gap: 4 },
  metaLabel: { fontSize: 10, fontWeight: '800', color: '#525252', textTransform: 'uppercase' },
  metaValue: { fontSize: 13, color: '#262626', fontStyle: 'italic' },
  passengerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  passengerTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passengerTagText: { fontSize: 11, color: '#525252' },
  telemetryBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BEDBFF',
  },
  telemetryLabel: { fontSize: 10, fontWeight: '700', color: '#2B7FFF', textTransform: 'uppercase' },
  telemetryValue: { fontSize: 12, color: '#1A6EEB', fontFamily: 'monospace', marginTop: 4 },
  actions: { gap: 10, marginTop: 6 },
  primaryButton: {
    backgroundColor: '#2B7FFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  fuelButton: {
    backgroundColor: '#FEF3C6',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  fuelButtonText: { color: '#D97706', fontWeight: '700', fontSize: 14 },
  completeButton: {
    backgroundColor: '#2F9B65',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2F9B65',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  chatButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2B7FFF',
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  chatButtonText: { color: '#2B7FFF', fontWeight: '700', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#171717' },
  modalSubtitle: { fontSize: 12, color: '#525252', lineHeight: 18 },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    color: '#171717',
    fontSize: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: '#525252', fontWeight: '600' },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: '#2F9B65',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#fff', fontWeight: '700' },
});
