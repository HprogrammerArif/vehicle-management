import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  MapPin, Flag, User, Shield, RefreshCw,
  Zap, Fuel, CheckCircle, MessageCircle, Satellite,
  Navigation, Phone, AlertTriangle, CheckSquare, Square, Wrench,
} from 'lucide-react-native';
import { tripsApi, maintenanceApi } from '../../src/services/api';
import { getMobileSocket } from '../../src/services/socket';
import { useMobileStore } from '../../src/store/useMobileStore';
import { AppHeader } from '../../src/components/AppHeader';
import { colors } from '../../src/theme/colors';
import { useToast } from '../../src/components/AppToast';

export default function ActiveTripScreen() {
  const router = useRouter();
  const { user } = useMobileStore();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any | null>(null);
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; speed?: number } | null>(null);

  // Start Trip modal state
  const [showStartModal, setShowStartModal] = useState(false);
  const [startOdometer, setStartOdometer] = useState('');
  const [preInspectionChecked, setPreInspectionChecked] = useState(true);
  const [starting, setStarting] = useState(false);

  // Complete Trip modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [endOdometer, setEndOdometer] = useState('');
  const [completing, setCompleting] = useState(false);

  // Emergency / Breakdown modal state
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [breakdownType, setBreakdownType] = useState<'BREAKDOWN' | 'TIRE_CHANGE' | 'OTHER'>('BREAKDOWN');
  const [breakdownNotes, setBreakdownNotes] = useState('');
  const [breakdownOdo, setBreakdownOdo] = useState('');
  const [submittingBreakdown, setSubmittingBreakdown] = useState(false);

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

  const handleOpenStartModal = () => {
    if (!activeTrip) return;
    const initialOdo = activeTrip.vehicle?.odometer ? String(activeTrip.vehicle.odometer) : '';
    setStartOdometer(initialOdo);
    setPreInspectionChecked(true);
    setShowStartModal(true);
  };

  const handleConfirmStartJourney = async () => {
    if (!activeTrip) return;
    const odoNum = parseFloat(startOdometer);
    if (isNaN(odoNum) || odoNum < 0) {
      showToast({
        type: 'warning',
        title: 'Invalid Odometer',
        message: 'Please enter a valid starting odometer reading.',
      });
      return;
    }

    setStarting(true);
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      setStarting(false);
      showToast({
        type: 'warning',
        title: 'Permission Denied',
        message: 'GPS location permission is needed to stream telemetry.',
      });
      return;
    }

    const res = await tripsApi.startTrip(activeTrip.id, odoNum);
    setStarting(false);
    setShowStartModal(false);

    if (!res.success) {
      showToast({
        type: 'error',
        title: 'Failed to Start',
        message: res.message || 'Could not start trip.',
      });
      return;
    }

    setActiveTrip((prev: any) => ({ ...prev, status: 'IN_PROGRESS', startOdometer: odoNum }));

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

    showToast({
      type: 'success',
      title: 'Journey Commenced',
      message: 'Live GPS telemetry active. Navigation ready.',
    });
  };

  const handleCompleteSubmit = async () => {
    if (!activeTrip) return;
    const odoNum = parseFloat(endOdometer);
    if (isNaN(odoNum) || odoNum <= 0) {
      showToast({
        type: 'warning',
        title: 'Required',
        message: 'Please enter a valid ending odometer reading.',
      });
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
      showToast({
        type: 'success',
        title: 'Mission Accomplished',
        message: 'Trip finalized. Vehicle and driver status updated to Available.',
      });
      setActiveTrip(null);
      fetchActiveTrip();
    } else {
      showToast({
        type: 'error',
        title: 'Error',
        message: res.message || 'Failed to complete trip.',
      });
    }
  };

  const openNavigation = () => {
    if (!activeTrip) return;
    const destLat = activeTrip.toOffice?.latitude;
    const destLng = activeTrip.toOffice?.longitude;
    const destName = toLocation;

    const navUrl =
      destLat && destLng
        ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destName)}`;

    Linking.openURL(navUrl).catch(() => {
      showToast({
        type: 'error',
        title: 'Navigation Error',
        message: 'Could not open maps application.',
      });
    });
  };

  const handleCallPerson = (phone?: string, name?: string) => {
    if (!phone) {
      showToast({
        type: 'warning',
        title: 'No Phone Number',
        message: `Phone number is not on file for ${name || 'contact'}.`,
      });
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      showToast({
        type: 'error',
        title: 'Dialer Error',
        message: 'Unable to open phone dialer.',
      });
    });
  };

  const handleOpenBreakdownModal = () => {
    setBreakdownType('BREAKDOWN');
    setBreakdownNotes('');
    setBreakdownOdo(activeTrip?.vehicle?.odometer ? String(activeTrip.vehicle.odometer) : '');
    setShowBreakdownModal(true);
  };

  const handleSubmitBreakdown = async () => {
    if (!activeTrip) return;
    if (!breakdownNotes.trim()) {
      showToast({
        type: 'warning',
        title: 'Details Required',
        message: 'Please briefly describe the breakdown or emergency.',
      });
      return;
    }

    const vehicleId = activeTrip.vehicleId || activeTrip.vehicle?.id;
    if (!vehicleId) {
      showToast({ type: 'error', title: 'Error', message: 'No vehicle attached to trip.' });
      return;
    }

    setSubmittingBreakdown(true);
    const res = await maintenanceApi.reportBreakdown({
      vehicleId,
      type: breakdownType,
      description: `[DRIVER SOS on Trip #${activeTrip.id.slice(-6)}] ${breakdownNotes.trim()}`,
      odometerAt: breakdownOdo ? parseFloat(breakdownOdo) : undefined,
      setInMaintenance: true,
    });
    setSubmittingBreakdown(false);
    setShowBreakdownModal(false);

    if (res?.success) {
      showToast({
        type: 'success',
        title: 'SOS / Incident Logged',
        message: 'Dispatch and Maintenance alerted. Vehicle marked In Maintenance.',
      });
    } else {
      showToast({
        type: 'error',
        title: 'Submission Failed',
        message: res?.message || 'Could not log breakdown report.',
      });
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
            <View style={styles.emptyIconCircle}>
              <Shield size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Standby Status: Available</Text>
            <Text style={styles.emptyDesc}>
              No active trips currently dispatched to your duty board. Pull down to refresh when admin assigns a vehicle.
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
              <RefreshCw size={14} color={colors.primary} />
              <Text style={styles.refreshBtnText}>Check Assignments</Text>
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
                <MapPin size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routePointLabel}>PICKUP</Text>
                  <Text style={styles.routePointName}>{fromLocation}</Text>
                </View>
              </View>
              <View style={styles.routeDivider} />
              <View style={styles.routePoint}>
                <Flag size={16} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routePointLabel}>DESTINATION</Text>
                  <Text style={styles.routePointName}>{toLocation}</Text>
                </View>
              </View>

              {/* Turn-by-Turn Navigation Trigger */}
              <TouchableOpacity style={styles.navigationBar} onPress={openNavigation}>
                <Navigation size={15} color="#2B7FFF" />
                <Text style={styles.navigationBarText}>Launch Google Maps Navigation</Text>
              </TouchableOpacity>
            </View>

            {/* Purpose & Requester/Passengers */}
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>PURPOSE</Text>
              <Text style={styles.metaValue}>"{activeTrip.purpose}"</Text>

              {/* Requester Contact */}
              {activeTrip.requester && (
                <View style={styles.contactRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaLabel}>REQUISITIONER</Text>
                    <Text style={styles.contactName}>{activeTrip.requester.name}</Text>
                  </View>
                  {activeTrip.requester.phone && (
                    <TouchableOpacity
                      style={styles.callPill}
                      onPress={() => handleCallPerson(activeTrip.requester.phone, activeTrip.requester.name)}
                    >
                      <Phone size={12} color="#10B981" />
                      <Text style={styles.callPillText}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Passengers List */}
              {activeTrip.passengers && activeTrip.passengers.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.metaLabel}>PASSENGERS ({activeTrip.passengers.length})</Text>
                  <View style={styles.passengerList}>
                    {activeTrip.passengers.map((p: any) => (
                      <View key={p.id || p.employeeId || p.name} style={styles.passengerRowItem}>
                        <View style={styles.passengerInfo}>
                          <User size={13} color={colors.textSecondary} />
                          <Text style={styles.passengerNameText} numberOfLines={1}>
                            {p.name}{p.employeeId ? ` (${p.employeeId})` : ''}
                          </Text>
                        </View>
                        {p.phone && (
                          <TouchableOpacity
                            style={styles.callMiniBtn}
                            onPress={() => handleCallPerson(p.phone, p.name)}
                          >
                            <Phone size={11} color="#10B981" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Live Telemetry Box */}
            <View style={styles.telemetryBox}>
              <View style={styles.telemetryLabelRow}>
                <Satellite size={13} color={colors.primary} />
                <Text style={styles.telemetryLabel}>GPS Telemetry Gateway</Text>
              </View>
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
              {activeTrip.status !== 'IN_PROGRESS' ? (
                <TouchableOpacity style={styles.primaryButton} onPress={handleOpenStartModal}>
                  <Zap size={18} color="#fff" />
                  <Text style={styles.buttonText}>Start Journey (Verify &amp; Activate GPS)</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.fuelButton}
                    onPress={() =>
                      router.push({
                        pathname: '/(driver)/fuel-log',
                        params: {
                          vehicleId: activeTrip.vehicleId || activeTrip.vehicle?.id || '',
                          tripId: activeTrip.id,
                          plateNumber: activeTrip.vehicle?.registrationNo || '',
                          makeModel: `${activeTrip.vehicle?.make || ''} ${activeTrip.vehicle?.model || ''}`.trim(),
                        },
                      })
                    }
                  >
                    <Fuel size={16} color="#D97706" />
                    <Text style={styles.fuelButtonText}>Log Fuel Purchase</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={() => {
                      setEndOdometer(
                        activeTrip.vehicle?.odometer ? String(activeTrip.vehicle.odometer) : ''
                      );
                      setShowCompleteModal(true);
                    }}
                  >
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.buttonText}>Complete Journey</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={() => router.push('/(driver)/conversations')}
                >
                  <MessageCircle size={15} color={colors.primary} />
                  <Text style={styles.chatButtonText}>Dispatch &amp; Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sosButton}
                  onPress={handleOpenBreakdownModal}
                >
                  <AlertTriangle size={15} color="#EF4444" />
                  <Text style={styles.sosButtonText}>SOS / Breakdown</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Start Journey Modal */}
        <Modal visible={showStartModal} transparent animationType="slide" onRequestClose={() => setShowStartModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Commence Journey</Text>
              <Text style={styles.modalSubtitle}>
                Verify vehicle dashboard odometer reading before dispatching.
              </Text>

              <View style={styles.modalFieldBox}>
                <Text style={styles.fieldLabel}>VEHICLE</Text>
                <Text style={styles.fieldValue}>
                  {activeTrip?.vehicle?.make} {activeTrip?.vehicle?.model} ({activeTrip?.vehicle?.registrationNo})
                </Text>
              </View>

              <View>
                <Text style={styles.fieldLabel}>STARTING ODOMETER (KM)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 45200"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={startOdometer}
                  onChangeText={setStartOdometer}
                />
              </View>

              {/* Quick pre-trip inspection toggle */}
              <TouchableOpacity
                style={styles.checkToggleRow}
                onPress={() => setPreInspectionChecked(!preInspectionChecked)}
                activeOpacity={0.8}
              >
                {preInspectionChecked ? (
                  <CheckSquare size={18} color={colors.primary} />
                ) : (
                  <Square size={18} color={colors.textMuted} />
                )}
                <Text style={styles.checkToggleText}>
                  Pre-trip check done (Tires, lights, fuel, exterior condition)
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowStartModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, starting && { opacity: 0.6 }]}
                  onPress={handleConfirmStartJourney}
                  disabled={starting}
                >
                  {starting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Commence GPS</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Complete Trip Modal */}
        <Modal visible={showCompleteModal} transparent animationType="slide" onRequestClose={() => setShowCompleteModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
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
          </KeyboardAvoidingView>
        </Modal>

        {/* Breakdown / SOS Modal */}
        <Modal visible={showBreakdownModal} transparent animationType="slide" onRequestClose={() => setShowBreakdownModal(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={20} color="#EF4444" />
                <Text style={styles.modalTitle}>Report Breakdown / SOS</Text>
              </View>
              <Text style={styles.modalSubtitle}>
                Alert central dispatch and maintenance immediately with your current vehicle status.
              </Text>

              <View style={styles.typeSelector}>
                {(['BREAKDOWN', 'TIRE_CHANGE', 'OTHER'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeOption, breakdownType === t && styles.typeOptionActive]}
                    onPress={() => setBreakdownType(t)}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        breakdownType === t && styles.typeOptionTextActive,
                      ]}
                    >
                      {t.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Describe issue (e.g. Engine overheating, flat front tire, minor collision)..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={breakdownNotes}
                onChangeText={setBreakdownNotes}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Current Odometer (km, optional)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={breakdownOdo}
                onChangeText={setBreakdownOdo}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowBreakdownModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    { backgroundColor: '#EF4444' },
                    submittingBreakdown && { opacity: 0.6 },
                  ]}
                  onPress={handleSubmitBreakdown}
                  disabled={submittingBreakdown}
                >
                  {submittingBreakdown ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit SOS Alert</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', gap: 12 },
  loadingText: { color: '#878787', fontSize: 13 },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#171717', marginBottom: 8 },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },
  refreshBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: '#FEF3C6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActive: { color: '#2F9B65', backgroundColor: '#DCFCE7' },
  plateText: { fontSize: 12, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  vehicleTitle: { fontSize: 19, fontWeight: '800', color: '#0F172A' },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routePointLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  routePointName: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 1 },
  routeDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BEDBFF',
    marginTop: 4,
  },
  navigationBarText: { fontSize: 12, fontWeight: '700', color: '#2B7FFF' },
  metaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
  metaValue: { fontSize: 13, color: '#334155', fontStyle: 'italic', marginTop: 2 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  contactName: { fontSize: 13, fontWeight: '700', color: '#1E293B', marginTop: 2 },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  callPillText: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  passengerList: { gap: 6, marginTop: 6 },
  passengerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passengerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  passengerNameText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  callMiniBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  telemetryBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BEDBFF',
  },
  telemetryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  telemetryLabel: { fontSize: 10, fontWeight: '700', color: '#2B7FFF', textTransform: 'uppercase' },
  telemetryValue: { fontSize: 12, color: '#1A6EEB', fontFamily: 'monospace', marginTop: 4 },
  actions: { gap: 10, marginTop: 4 },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2B7FFF',
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
  },
  fuelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C6',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 13,
    borderRadius: 14,
  },
  fuelButtonText: { color: '#D97706', fontWeight: '700', fontSize: 14 },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2F9B65',
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 3,
  },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  secondaryActionsRow: { flexDirection: 'row', gap: 10 },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2B7FFF',
    paddingVertical: 12,
    borderRadius: 12,
  },
  chatButtonText: { color: '#2B7FFF', fontWeight: '700', fontSize: 13 },
  sosButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 12,
  },
  sosButtonText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#171717' },
  modalSubtitle: { fontSize: 12, color: '#525252', lineHeight: 18 },
  modalFieldBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
  },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5, marginBottom: 2 },
  fieldValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    color: '#171717',
    fontSize: 15,
  },
  checkToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checkToggleText: { fontSize: 12, color: '#475569', flex: 1, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: { color: '#525252', fontWeight: '600' },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: '#2F9B65',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#fff', fontWeight: '700' },
  typeSelector: { flexDirection: 'row', gap: 6, marginVertical: 4 },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  typeOptionActive: { backgroundColor: '#FEE2E2', borderColor: '#F87171' },
  typeOptionText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  typeOptionTextActive: { color: '#EF4444' },
});
