import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ChevronLeft,
  CheckCircle2,
  Clock,
  HeartPulse,
  Palmtree,
  User,
  Coffee,
  AlertCircle,
  Plus,
} from 'lucide-react-native';
import { driverApi } from '../../src/services/api';
import { useMobileStore } from '../../src/store/useMobileStore';
import { useToast } from '../../src/components/AppToast';

type LeaveType = 'SICK' | 'VACATION' | 'PERSONAL' | 'HOLIDAY';

interface LeaveRecord {
  id: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  isApproved: boolean;
  createdAt: string;
}

const LEAVE_TYPES: { type: LeaveType; label: string; icon: any; color: string; bg: string }[] = [
  { type: 'SICK', label: 'Sick Leave', icon: HeartPulse, color: '#EF4444', bg: '#FEF2F2' },
  { type: 'VACATION', label: 'Vacation', icon: Palmtree, color: '#2B7FFF', bg: '#EFF6FF' },
  { type: 'PERSONAL', label: 'Personal', icon: User, color: '#8B5CF6', bg: '#F5F3FF' },
  { type: 'HOLIDAY', label: 'Holiday', icon: Coffee, color: '#F59E0B', bg: '#FFFBEB' },
];

export default function DriverLeaveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useMobileStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply');
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [selectedType, setSelectedType] = useState<LeaveType>('SICK');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaveHistory = useCallback(async (silent = false) => {
    if (!user?.driverId) return;
    if (!silent) setLoadingHistory(true);
    try {
      const res = await driverApi.getDriverDetails(user.driverId);
      if (res?.success && res.data?.leaveRequests) {
        setLeaves(res.data.leaveRequests);
      }
    } catch (_) {
      // silent
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  }, [user?.driverId]);

  useEffect(() => {
    fetchLeaveHistory();
  }, [fetchLeaveHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaveHistory(true);
  };

  const handleApplyLeave = async () => {
    if (!startDate || !endDate) {
      showToast({
        type: 'warning',
        title: 'Dates Required',
        message: 'Please provide both start date and end date.',
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      showToast({
        type: 'warning',
        title: 'Invalid Date Range',
        message: 'Start date cannot be after end date.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await driverApi.requestLeave({
        driverId: user?.driverId,
        leaveType: selectedType,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        reason: reason.trim() || undefined,
      });

      setSubmitting(false);
      if (res?.success) {
        showToast({
          type: 'success',
          title: 'Leave Requested',
          message: 'Your leave application has been submitted to Dispatch & Fleet Admin.',
        });
        setReason('');
        setActiveTab('history');
        fetchLeaveHistory(true);
      } else {
        showToast({
          type: 'error',
          title: 'Request Failed',
          message: res?.message || 'Could not submit leave application.',
        });
      }
    } catch (e: any) {
      setSubmitting(false);
      showToast({
        type: 'error',
        title: 'Error',
        message: e?.message || 'Network error occurred.',
      });
    }
  };

  const approvedCount = leaves.filter((l) => l.isApproved).length;
  const pendingCount = leaves.filter((l) => !l.isApproved).length;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 48) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Driver Leave</Text>
          <Text style={styles.headerSub}>Request time off &amp; check roster approvals</Text>
        </View>
      </View>

      {/* Stats Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{leaves.length}</Text>
          <Text style={styles.summaryLabel}>Total Leaves</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#10B981' }]}>{approvedCount}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending Review</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'apply' && styles.tabActive]}
          onPress={() => setActiveTab('apply')}
        >
          <Plus size={14} color={activeTab === 'apply' ? '#2B7FFF' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'apply' && styles.tabTextActive]}>
            Apply Leave
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => {
            setActiveTab('history');
            fetchLeaveHistory();
          }}
        >
          <Calendar size={14} color={activeTab === 'history' ? '#2B7FFF' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            My Requests{leaves.length > 0 ? ` (${leaves.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Apply Leave Tab */}
      {activeTab === 'apply' ? (
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.formContainer, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
          keyboardShouldPersistTaps="handled"
          bottomOffset={40}
        >
          <Text style={styles.sectionTitle}>Select Leave Category</Text>
          <View style={styles.typeGrid}>
            {LEAVE_TYPES.map((t) => {
              const IconComp = t.icon;
              const isSelected = selectedType === t.type;
              return (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.typeCard,
                    isSelected && { borderColor: t.color, backgroundColor: t.bg },
                  ]}
                  onPress={() => setSelectedType(t.type)}
                >
                  <View style={[styles.typeIconBox, { backgroundColor: t.bg }]}>
                    <IconComp size={18} color={t.color} />
                  </View>
                  <Text style={[styles.typeLabel, isSelected && { color: t.color, fontWeight: '700' }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dates Input */}
          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Start Date</Text>
              <View style={styles.inputWrap}>
                <Calendar size={15} color="#94A3B8" />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#CBD5E1"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>End Date</Text>
              <View style={styles.inputWrap}>
                <Calendar size={15} color="#94A3B8" />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#CBD5E1"
                  value={endDate}
                  onChangeText={setEndDate}
                />
              </View>
            </View>
          </View>

          {/* Reason */}
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Reason / Remarks</Text>
            <TextInput
              style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              placeholder="e.g. Medical appointment, family visit, emergency rest..."
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
            />
          </View>

          <View style={styles.noticeBox}>
            <AlertCircle size={15} color="#2B7FFF" />
            <Text style={styles.noticeText}>
              Submitting a leave request alerts central dispatch. Once approved by fleet administration, your status will temporarily switch to "ON LEAVE".
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={handleApplyLeave}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <CheckCircle2 size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Leave Application</Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      ) : (
        /* History Tab */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 18, gap: 12, paddingBottom: Math.max(insets.bottom + 24, 40) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B7FFF" />}
        >
          {loadingHistory ? (
            <View style={styles.center}>
              <ActivityIndicator color="#2B7FFF" size="large" />
              <Text style={styles.centerText}>Loading leave records…</Text>
            </View>
          ) : leaves.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={36} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Leave Records Found</Text>
              <Text style={styles.emptySub}>You have not submitted any leave requests yet.</Text>
            </View>
          ) : (
            leaves.map((item) => {
              const matchedType = LEAVE_TYPES.find((t) => t.type === item.leaveType) || LEAVE_TYPES[0];
              const IconComp = matchedType.icon;
              const startStr = new Date(item.startDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const endStr = new Date(item.endDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.histHeaderRow}>
                    <View style={styles.histTypeGroup}>
                      <View style={[styles.histTypeIcon, { backgroundColor: matchedType.bg }]}>
                        <IconComp size={15} color={matchedType.color} />
                      </View>
                      <View>
                        <Text style={styles.histTypeName}>{matchedType.label}</Text>
                        <Text style={styles.histDateRange}>
                          {startStr} → {endStr}
                        </Text>
                      </View>
                    </View>

                    {item.isApproved ? (
                      <View style={styles.approvedBadge}>
                        <CheckCircle2 size={12} color="#10B981" />
                        <Text style={styles.approvedBadgeText}>Approved</Text>
                      </View>
                    ) : (
                      <View style={styles.pendingBadge}>
                        <Clock size={12} color="#D97706" />
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </View>
                    )}
                  </View>

                  {item.reason ? (
                    <Text style={styles.histReasonText}>"{item.reason}"</Text>
                  ) : null}

                  <View style={styles.histFooter}>
                    <Text style={styles.histTime}>
                      Submitted on{' '}
                      {new Date(item.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  summaryLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  summaryDivider: { width: 1, height: 26, backgroundColor: '#E2E8F0' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2B7FFF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#2B7FFF' },
  scroll: { flex: 1 },
  formContainer: { padding: 18, gap: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  typeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  formRow: { flexDirection: 'row', gap: 12 },
  formCol: { flex: 1, gap: 6 },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    height: 44,
  },
  inputWithIcon: { flex: 1, fontSize: 14, color: '#1E293B' },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BEDBFF',
    borderRadius: 10,
    padding: 12,
  },
  noticeText: { flex: 1, fontSize: 11, color: '#1D4ED8', lineHeight: 16 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2B7FFF',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
    elevation: 2,
  },
  submitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  center: { padding: 40, alignItems: 'center', gap: 10 },
  centerText: { fontSize: 13, color: '#94A3B8' },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginTop: 6 },
  emptySub: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  histHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histTypeGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  histTypeIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  histTypeName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  histDateRange: { fontSize: 11, color: '#64748B', marginTop: 1 },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  approvedBadgeText: { fontSize: 10, fontWeight: '800', color: '#16A34A' },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  histReasonText: { fontSize: 12, color: '#475569', fontStyle: 'italic', marginTop: 2 },
  histFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 6, marginTop: 2 },
  histTime: { fontSize: 10, color: '#94A3B8' },
});
