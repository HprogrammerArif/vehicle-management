import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Flag,
  User,
  Car,
  UserCheck,
  Repeat,
  ArrowRight,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  Truck,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from 'lucide-react-native';
import { tripsApi } from '../../src/services/api';
import { useMobileStore } from '../../src/store/useMobileStore';
import { AppHeader } from '../../src/components/AppHeader';
import { statusColors, colors } from '../../src/theme/colors';

// ─── Status Timeline ────────────────────────────────────────────────────────

const STATUS_FLOW = [
  { key: 'PENDING', label: 'Submitted', icon: Clock },
  { key: 'APPROVED', label: 'Approved', icon: CheckCircle2 },
  { key: 'IN_PROGRESS', label: 'En Route', icon: Truck },
  { key: 'COMPLETED', label: 'Completed', icon: Flag },
];

const TERMINAL_STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  REJECTED: { label: 'Rejected', color: '#EF4444', bg: '#FEE2E2' },
  CANCELLED: { label: 'Cancelled', color: '#64748B', bg: '#F1F5F9' },
};

function StatusTimeline({ status }: { status: string }) {
  if (TERMINAL_STATUSES[status]) {
    const t = TERMINAL_STATUSES[status];
    return (
      <View style={[tlStyles.terminalRow, { backgroundColor: t.bg }]}>
        <XCircle size={14} color={t.color} />
        <Text style={[tlStyles.terminalText, { color: t.color }]}>{t.label}</Text>
      </View>
    );
  }

  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === status);

  return (
    <View style={tlStyles.container}>
      {STATUS_FLOW.map((step, idx) => {
        const isDone = idx <= currentIdx;
        const isActive = idx === currentIdx;
        const StepIcon = step.icon;

        return (
          <React.Fragment key={step.key}>
            <View style={tlStyles.stepWrap}>
              <View
                style={[
                  tlStyles.dot,
                  isDone ? tlStyles.dotDone : tlStyles.dotPending,
                  isActive && tlStyles.dotActive,
                ]}
              >
                <StepIcon
                  size={9}
                  color={isDone ? '#fff' : '#CBD5E1'}
                  strokeWidth={2.5}
                />
              </View>
              <Text
                style={[tlStyles.label, isDone ? tlStyles.labelDone : tlStyles.labelPending]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {idx < STATUS_FLOW.length - 1 && (
              <View style={[tlStyles.line, idx < currentIdx ? tlStyles.lineDone : tlStyles.linePending]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const tlStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingBottom: 4,
  },
  stepWrap: { alignItems: 'center', gap: 4, width: 52 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotDone: { backgroundColor: colors.primary },
  dotActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  dotPending: { backgroundColor: '#E2E8F0', borderWidth: 1.5, borderColor: '#CBD5E1' },
  label: { fontSize: 9, fontWeight: '600', textAlign: 'center', width: 52 },
  labelDone: { color: colors.primary },
  labelPending: { color: '#94A3B8' },
  line: { flex: 1, height: 2, marginTop: 11, borderRadius: 2 },
  lineDone: { backgroundColor: colors.primary },
  linePending: { backgroundColor: '#E2E8F0' },
  terminalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  terminalText: { fontSize: 12, fontWeight: '700' },
});

// ─── Stats Card ──────────────────────────────────────────────────────────────

function StatsCard({ trips }: { trips: any[] }) {
  const stats = useMemo(() => {
    const total = trips.length;
    const completed = trips.filter((t) => t.status === 'COMPLETED').length;
    const pending = trips.filter((t) => t.status === 'PENDING').length;
    const inProgress = trips.filter((t) => t.status === 'IN_PROGRESS').length;
    const cancelled = trips.filter((t) => t.status === 'CANCELLED').length;

    // Most visited destination
    const destCount: Record<string, number> = {};
    trips.forEach((t) => {
      const dest = t.toOffice?.name || t.dropoffAddress || '';
      if (dest) destCount[dest] = (destCount[dest] || 0) + 1;
    });
    const topDest = Object.entries(destCount).sort((a, b) => b[1] - a[1])[0]?.[0];

    // This month
    const now = new Date();
    const thisMonth = trips.filter((t) => {
      const d = new Date(t.departureAt || t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return { total, completed, pending, inProgress, cancelled, topDest, thisMonth };
  }, [trips]);

  return (
    <View style={scStyles.card}>
      <View style={scStyles.headerRow}>
        <View style={scStyles.headerIconWrap}>
          <BarChart3 size={16} color={colors.primary} />
        </View>
        <Text style={scStyles.headerTitle}>My Trip Summary</Text>
        <View style={scStyles.monthBadge}>
          <CalendarDays size={10} color={colors.primary} />
          <Text style={scStyles.monthBadgeText}>
            {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      <View style={scStyles.statsGrid}>
        <View style={[scStyles.statBox, { backgroundColor: '#EFF6FF', borderColor: '#BEDBFF' }]}>
          <Text style={[scStyles.statNum, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={scStyles.statLabel}>Total</Text>
        </View>
        <View style={[scStyles.statBox, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
          <Text style={[scStyles.statNum, { color: '#2F9B65' }]}>{stats.completed}</Text>
          <Text style={scStyles.statLabel}>Done</Text>
        </View>
        <View style={[scStyles.statBox, { backgroundColor: '#FEF3C6', borderColor: '#FDE68A' }]}>
          <Text style={[scStyles.statNum, { color: '#D97706' }]}>{stats.pending}</Text>
          <Text style={scStyles.statLabel}>Pending</Text>
        </View>
        <View style={[scStyles.statBox, { backgroundColor: '#DFF2FE', borderColor: '#BEDBFF' }]}>
          <Text style={[scStyles.statNum, { color: '#0284C7' }]}>{stats.thisMonth}</Text>
          <Text style={scStyles.statLabel}>This Month</Text>
        </View>
      </View>

      {stats.topDest ? (
        <View style={scStyles.destRow}>
          <TrendingUp size={12} color={colors.primary} />
          <Text style={scStyles.destLabel}>Most visited:</Text>
          <Text style={scStyles.destValue} numberOfLines={1}>{stats.topDest}</Text>
        </View>
      ) : null}
    </View>
  );
}

const scStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  monthBadgeText: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryTint,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  destLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  destValue: { fontSize: 11, color: colors.primary, fontWeight: '700', flex: 1 },
});

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

interface CancelModalProps {
  visible: boolean;
  tripId: string | null;
  onClose: () => void;
  onConfirm: (tripId: string, reason: string) => Promise<void>;
}

function CancelModal({ visible, tripId, onClose, onConfirm }: CancelModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!tripId) return;
    setLoading(true);
    await onConfirm(tripId, reason);
    setLoading(false);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={cmStyles.backdrop} onPress={handleClose}>
          <Pressable style={cmStyles.sheet} onPress={() => {}}>
          <View style={cmStyles.iconWrap}>
            <AlertTriangle size={28} color="#D97706" />
          </View>
          <Text style={cmStyles.title}>Cancel Trip?</Text>
          <Text style={cmStyles.desc}>
            This will cancel your trip request. Any assigned vehicle or driver will be released.
          </Text>

          <View style={cmStyles.inputWrap}>
            <Text style={cmStyles.inputLabel}>Reason (optional)</Text>
            <TextInput
              style={cmStyles.input}
              placeholder="e.g. Plans changed, no longer required…"
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={cmStyles.actions}>
            <TouchableOpacity style={cmStyles.cancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={cmStyles.cancelBtnText}>Keep Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cmStyles.confirmBtn, loading && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={cmStyles.confirmBtnText}>Yes, Cancel</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const cmStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
    paddingBottom: 36,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FEF3C6',
    borderWidth: 1,
    borderColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  desc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputWrap: { gap: 6 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 72,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyTripsScreen() {
  const router = useRouter();
  const { user } = useMobileStore();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    const res = await tripsApi.getMyTrips();
    if (res.success && res.data) setTrips(res.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const onRefresh = () => { setRefreshing(true); fetchTrips(); };

  const handleCancelConfirm = async (tripId: string, _reason: string) => {
    const res = await tripsApi.cancelTrip(tripId);
    if (res.success) {
      setTrips((prev) =>
        prev.map((t) => t.id === tripId ? { ...t, status: 'CANCELLED' } : t)
      );
    }
    setCancelTargetId(null);
  };

  const canCancel = (status: string) =>
    status === 'PENDING' || status === 'APPROVED';

  const renderTrip = ({ item }: { item: any }) => {
    const s = statusColors[item.status] || statusColors.CANCELLED;
    const dept = new Date(item.departureAt);
    const fromLoc = item.fromOffice?.name || item.pickupAddress || 'Origin';
    const toLoc = item.toOffice?.name || item.dropoffAddress || 'Destination';
    const isCustom = !item.fromOfficeId || !item.toOfficeId;
    const isExpanded = expandedId === item.id;

    return (
      <View style={styles.card}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
            </View>
            {isCustom && (
              <View style={[styles.badge, { backgroundColor: '#EFF6FF', borderColor: '#BEDBFF', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                <MapPin size={10} color="#2B7FFF" />
                <Text style={[styles.badgeText, { color: '#2B7FFF', fontSize: 10 }]}>Custom</Text>
              </View>
            )}
          </View>
          <Text style={styles.date}>
            {dept.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        {/* Route */}
        <View style={styles.route}>
          <View style={styles.routeCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} color="#2B7FFF" />
              <Text style={styles.routeFrom} numberOfLines={2}>{fromLoc}</Text>
            </View>
          </View>
          <Text style={styles.routeArrow}>→</Text>
          <View style={styles.routeCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <Flag size={12} color="#EF4444" />
              <Text style={styles.routeTo} numberOfLines={2}>{toLoc}</Text>
            </View>
          </View>
        </View>

        {/* Purpose */}
        <Text style={styles.purpose} numberOfLines={isExpanded ? undefined : 2}>{item.purpose}</Text>

        {/* Status Timeline */}
        <StatusTimeline status={item.status} />

        {/* Expand / Collapse toggle */}
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          {isExpanded ? (
            <ChevronUp size={14} color={colors.textMuted} />
          ) : (
            <ChevronDown size={14} color={colors.textMuted} />
          )}
          <Text style={styles.expandBtnText}>{isExpanded ? 'Show less' : 'Show details'}</Text>
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {/* Trip type */}
            <View style={styles.detailRow}>
              {item.tripType === 'ROUND_TRIP' ? (
                <><Repeat size={12} color="#878787" /><Text style={styles.detailText}>Round Trip</Text></>
              ) : item.tripType === 'ONE_WAY' ? (
                <><ArrowRight size={12} color="#878787" /><Text style={styles.detailText}>One Way</Text></>
              ) : (
                <><RefreshCw size={12} color="#878787" /><Text style={styles.detailText}>Pickup & Drop-off</Text></>
              )}
            </View>

            {/* Vehicle */}
            {item.vehicle && (
              <View style={styles.detailRow}>
                <Car size={12} color="#878787" />
                <Text style={styles.detailLabel}>Vehicle:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.vehicle.make} {item.vehicle.model} · {item.vehicle.registrationNo}
                </Text>
              </View>
            )}

            {/* Driver */}
            {item.driver && (
              <View style={styles.detailRow}>
                <UserCheck size={12} color="#878787" />
                <Text style={styles.detailLabel}>Driver:</Text>
                <Text style={styles.detailValue}>{item.driver.user?.name}</Text>
              </View>
            )}

            {/* Passengers */}
            {item.passengers && item.passengers.length > 0 && (
              <View style={styles.passengerWrap}>
                <Text style={styles.passengerLabel}>Colleagues:</Text>
                <View style={styles.passengerTags}>
                  {item.passengers.map((p: any) => (
                    <View key={p.id || p.employeeId || p.name} style={styles.passengerTag}>
                      <User size={10} color="#525252" />
                      <Text style={styles.passengerTagText}>
                        {p.name}{p.employeeId ? ` (${p.employeeId})` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Cancel Button */}
            {canCancel(item.status) && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCancelTargetId(item.id)}
                activeOpacity={0.8}
              >
                <XCircle size={14} color="#EF4444" />
                <Text style={styles.cancelBtnText}>Cancel This Trip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader activeScreen="my-trips" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2B7FFF" size="large" />
          <Text style={styles.loadingText}>Loading trips…</Text>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconCircle}>
            <Car size={36} color="#2B7FFF" />
          </View>
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
          ListHeaderComponent={<StatsCard trips={trips} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B7FFF" />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CancelModal
        visible={cancelTargetId !== null}
        tripId={cancelTargetId}
        onClose={() => setCancelTargetId(null)}
        onConfirm={handleCancelConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 11, color: '#878787', fontWeight: '500' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeCol: { flex: 1 },
  routeFrom: { fontSize: 13, color: '#171717', fontWeight: '600', flex: 1 },
  routeArrow: { fontSize: 12, color: '#2B7FFF', fontWeight: '700' },
  routeTo: { fontSize: 13, color: '#171717', fontWeight: '600', flex: 1, textAlign: 'right' },
  purpose: { fontSize: 13, color: '#525252', lineHeight: 19 },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  expandBtnText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  expandedSection: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: { fontSize: 11, color: '#878787', fontWeight: '600', textTransform: 'uppercase' },
  detailText: { fontSize: 12, color: '#525252', fontWeight: '600' },
  detailValue: { fontSize: 12, color: '#171717', fontWeight: '600', flex: 1 },
  passengerWrap: { gap: 4 },
  passengerLabel: { fontSize: 10, color: '#878787', fontWeight: '700', textTransform: 'uppercase' },
  passengerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  passengerTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  passengerTagText: { fontSize: 11, color: '#525252', fontWeight: '500' },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#878787', fontSize: 13, marginTop: 8 },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#171717' },
  emptyDesc: { fontSize: 13, color: '#525252' },
  emptyBtn: {
    backgroundColor: '#2B7FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
});
