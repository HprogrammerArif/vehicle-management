import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Fuel,
  AlertTriangle,
  CheckCircle,
  Gauge,
  MapPin,
  Calendar,
  TrendingUp,
  DollarSign,
  Droplets,
  ChevronLeft,
} from 'lucide-react-native';
import { mobileApi, mobileChatApi } from '../../src/services/api';
import { useMobileStore } from '../../src/store/useMobileStore';


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface FuelLogEntry {
  id: string;
  loggedAt: string;
  odometerReading: number;
  fuelAdded: number;
  pricePerLiter: number;
  totalCost: number;
  stationName?: string;
  consumptionRate?: number;
  isAnomaly: boolean;
  notes?: string;
  vehicle?: { plateNumber?: string; make?: string; model?: string };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

// ─────────────────────────────────────────────
// History Card
// ─────────────────────────────────────────────
function HistoryCard({ item }: { item: FuelLogEntry }) {
  return (
    <View style={[styles.histCard, item.isAnomaly && styles.histCardAnomaly]}>
      {/* Header row */}
      <View style={styles.histCardHeader}>
        <View style={styles.histCardLeft}>
          <View style={[styles.histIconBadge, item.isAnomaly ? styles.histIconBadgeRed : styles.histIconBadgeBlue]}>
            <Fuel size={14} color={item.isAnomaly ? '#EF4444' : '#2B7FFF'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.histStation} numberOfLines={1}>
              {item.stationName || 'Fuel Station'}
            </Text>
            <View style={styles.histMeta}>
              <Calendar size={11} color="#94A3B8" />
              <Text style={styles.histMetaText}>{fmtDate(item.loggedAt)}</Text>
              <Text style={styles.histMetaDot}>·</Text>
              <Text style={styles.histMetaText}>{fmtTime(item.loggedAt)}</Text>
            </View>
          </View>
        </View>

        {item.isAnomaly ? (
          <View style={styles.anomalyBadge}>
            <AlertTriangle size={11} color="#EF4444" />
            <Text style={styles.anomalyBadgeText}>Anomaly</Text>
          </View>
        ) : (
          <View style={styles.okBadge}>
            <CheckCircle size={11} color="#10B981" />
            <Text style={styles.okBadgeText}>Normal</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.histStatsRow}>
        <View style={styles.histStat}>
          <Droplets size={13} color="#2B7FFF" />
          <Text style={styles.histStatVal}>{fmt(item.fuelAdded, 1)} L</Text>
          <Text style={styles.histStatLabel}>Added</Text>
        </View>
        <View style={styles.histStatDivider} />
        <View style={styles.histStat}>
          <DollarSign size={13} color="#8B5CF6" />
          <Text style={styles.histStatVal}>৳{fmt(item.totalCost)}</Text>
          <Text style={styles.histStatLabel}>Total</Text>
        </View>
        <View style={styles.histStatDivider} />
        <View style={styles.histStat}>
          <Gauge size={13} color="#F59E0B" />
          <Text style={styles.histStatVal}>{fmt(item.odometerReading)} km</Text>
          <Text style={styles.histStatLabel}>Odometer</Text>
        </View>
        <View style={styles.histStatDivider} />
        <View style={styles.histStat}>
          <TrendingUp size={13} color="#10B981" />
          <Text style={styles.histStatVal}>
            {item.consumptionRate ? fmt(item.consumptionRate, 1) : '—'} km/L
          </Text>
          <Text style={styles.histStatLabel}>Efficiency</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.histFooter}>
        <Text style={styles.histPriceLabel}>Price per litre:</Text>
        <Text style={styles.histPriceVal}>৳{fmt(item.pricePerLiter, 2)}</Text>
        {item.vehicle?.plateNumber && (
          <>
            <Text style={styles.histMetaDot}>·</Text>
            <MapPin size={11} color="#94A3B8" />
            <Text style={styles.histPriceLabel}>{item.vehicle.plateNumber}</Text>
          </>
        )}
      </View>

      {/* Anomaly note */}
      {item.isAnomaly && item.notes && (
        <View style={styles.anomalyNote}>
          <AlertTriangle size={12} color="#EF4444" />
          <Text style={styles.anomalyNoteText}>{item.notes}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Summary Bar
// ─────────────────────────────────────────────
function SummaryBar({ logs }: { logs: FuelLogEntry[] }) {
  const totalCost = logs.reduce((s, l) => s + l.totalCost, 0);
  const totalLiters = logs.reduce((s, l) => s + l.fuelAdded, 0);
  const anomalies = logs.filter((l) => l.isAnomaly).length;

  return (
    <View style={styles.summaryBar}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryVal}>{logs.length}</Text>
        <Text style={styles.summaryLabel}>Total Logs</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryVal}>{fmt(totalLiters, 0)} L</Text>
        <Text style={styles.summaryLabel}>Fuel Used</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryVal}>৳{fmt(totalCost)}</Text>
        <Text style={styles.summaryLabel}>Total Spent</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={[styles.summaryVal, anomalies > 0 && styles.summaryValRed]}>{anomalies}</Text>
        <Text style={styles.summaryLabel}>Anomalies</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────
export default function FuelLogScreen() {
  const router = useRouter();
  const { user } = useMobileStore();

  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Form state
  const [odometer, setOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [price, setPrice] = useState('');
  const [station, setStation] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // History state
  const [logs, setLogs] = useState<FuelLogEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setHistLoading(true);
    try {
      const driverId = user?.driverId || '';
      const query = driverId ? `?driverId=${driverId}` : '';
      const res = await mobileApi(`/fuel${query}`);
      if (res?.success && Array.isArray(res.data)) {
        setLogs(res.data);
      }
    } catch (_) {
      // silent fail
    } finally {
      setHistLoading(false);
      setRefreshing(false);
    }
  }, [user?.driverId]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'history') fetchHistory();
    }, [activeTab, fetchHistory])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(true);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is required to photograph receipts.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets?.length > 0) {
      setReceiptImage(result.assets[0].uri);
    }
  };

  const handleLogFuel = async () => {
    if (!odometer || !liters || !price) {
      Alert.alert('Missing Fields', 'Please fill in Odometer, Fuel Added, and Price per litre.');
      return;
    }
    setLoading(true);
    let finalPhotoUrl = '';

    if (receiptImage && !receiptImage.startsWith('http')) {
      const uploadRes = await mobileChatApi.uploadAttachment(receiptImage, 'fuel-receipt.jpg');
      if (uploadRes?.success && uploadRes.url) finalPhotoUrl = uploadRes.url;
    } else if (receiptImage) {
      finalPhotoUrl = receiptImage;
    }

    const res = await mobileApi('/fuel', {
      method: 'POST',
      body: JSON.stringify({
        vehicleId: 'cmuf7t2m6000lf6wpsjwhb0i5',
        driverId: user?.driverId || 'cmuf7sv730009f6wp06cs1lke',
        odometerReading: parseFloat(odometer),
        fuelAdded: parseFloat(liters),
        pricePerLiter: parseFloat(price),
        stationName: station || 'City Central Fuel Station',
        receiptPhoto: finalPhotoUrl || undefined,
      }),
    });

    setLoading(false);
    if (res?.success) {
      Alert.alert(
        res.data?.isAnomaly ? 'Anomaly Detected' : 'Fuel Logged',
        res.message || 'Fuel log submitted successfully.',
        [
          {
            text: 'View History',
            onPress: () => { setActiveTab('history'); fetchHistory(); },
          },
          { text: 'OK' },
        ]
      );
      setOdometer('');
      setLiters('');
      setPrice('');
      setStation('');
      setReceiptImage(null);
    } else {
      Alert.alert('Submission Error', res?.message || 'Could not log fuel receipt');
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Fuel Log</Text>
          <Text style={styles.headerSub}>Track &amp; verify fuel consumption</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'form' && styles.tabActive]}
          onPress={() => setActiveTab('form')}
        >
          <Fuel size={14} color={activeTab === 'form' ? '#2B7FFF' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'form' && styles.tabTextActive]}>New Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => { setActiveTab('history'); fetchHistory(); }}
        >
          <TrendingUp size={14} color={activeTab === 'history' ? '#2B7FFF' : '#94A3B8'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History{logs.length > 0 ? ` (${logs.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── New Entry Tab ── */}
      {activeTab === 'form' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          {/* Photo Picker */}
          <TouchableOpacity style={styles.photoBox} onPress={takePhoto}>
            {receiptImage ? (
              <Image source={{ uri: receiptImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <View style={styles.photoIconCircle}>
                  <Camera size={28} color="#2B7FFF" />
                </View>
                <Text style={styles.photoTitle}>Photograph Receipt</Text>
                <Text style={styles.photoHint}>Tap to open camera — required for verification</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Odometer + Liters */}
          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Odometer (km)</Text>
              <View style={styles.inputWrap}>
                <Gauge size={15} color="#94A3B8" />
                <TextInput
                  style={styles.inputWithIcon}
                  keyboardType="numeric"
                  placeholder="e.g. 18460"
                  placeholderTextColor="#CBD5E1"
                  value={odometer}
                  onChangeText={setOdometer}
                />
              </View>
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Fuel Added (L)</Text>
              <View style={styles.inputWrap}>
                <Droplets size={15} color="#94A3B8" />
                <TextInput
                  style={styles.inputWithIcon}
                  keyboardType="numeric"
                  placeholder="e.g. 45"
                  placeholderTextColor="#CBD5E1"
                  value={liters}
                  onChangeText={setLiters}
                />
              </View>
            </View>
          </View>

          {/* Price + Station */}
          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.label}>Price / Litre (৳)</Text>
              <View style={styles.inputWrap}>
                <DollarSign size={15} color="#94A3B8" />
                <TextInput
                  style={styles.inputWithIcon}
                  keyboardType="numeric"
                  placeholder="e.g. 130"
                  placeholderTextColor="#CBD5E1"
                  value={price}
                  onChangeText={setPrice}
                />
              </View>
            </View>
            <View style={styles.formCol}>
              <Text style={styles.label}>Station Name</Text>
              <View style={styles.inputWrap}>
                <MapPin size={15} color="#94A3B8" />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Station name"
                  placeholderTextColor="#CBD5E1"
                  value={station}
                  onChangeText={setStation}
                />
              </View>
            </View>
          </View>

          {/* Cost Preview */}
          {odometer !== '' && liters !== '' && price !== '' && (
            <View style={styles.costPreview}>
              <Text style={styles.costPreviewLabel}>Estimated Total Cost</Text>
              <Text style={styles.costPreviewVal}>
                ৳{fmt(parseFloat(liters || '0') * parseFloat(price || '0'))}
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogFuel}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Fuel size={16} color="#fff" />
                <Text style={styles.buttonText}>Submit Fuel Log</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── History Tab ── */}
      {activeTab === 'history' && (
        <>
          {histLoading ? (
            <View style={styles.centred}>
              <ActivityIndicator size="large" color="#2B7FFF" />
              <Text style={styles.loadingText}>Loading history…</Text>
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.centred}>
              <Fuel size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Fuel Logs Yet</Text>
              <Text style={styles.emptyHint}>Your submitted fuel logs will appear here.</Text>
            </View>
          ) : (
            <FlatList
              data={logs}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.histList}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2B7FFF" />
              }
              ListHeaderComponent={<SummaryBar logs={logs} />}
              renderItem={({ item }) => <HistoryCard item={item} />}
            />
          )}
        </>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#2B7FFF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#2B7FFF' },

  scroll: { flex: 1 },
  formContent: { padding: 20, gap: 16, paddingBottom: 40 },

  photoBox: {
    height: 150,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BEDBFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPlaceholder: { alignItems: 'center', gap: 6 },
  photoIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  photoTitle: { fontSize: 14, fontWeight: '700', color: '#2B7FFF' },
  photoHint: { fontSize: 11, color: '#64748B' },
  previewImage: { width: '100%', height: '100%' },

  formRow: { flexDirection: 'row', gap: 12 },
  formCol: { flex: 1, gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', letterSpacing: 0.3 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  inputWithIcon: { flex: 1, paddingVertical: 13, color: '#1E293B', fontSize: 14 },

  costPreview: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BEDBFF',
  },
  costPreviewLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  costPreviewVal: { fontSize: 18, fontWeight: '800', color: '#2B7FFF' },

  button: {
    backgroundColor: '#2B7FFF',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  loadingText: { fontSize: 14, color: '#94A3B8' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 8 },
  emptyHint: { fontSize: 13, color: '#94A3B8', textAlign: 'center' },

  histList: { padding: 16, gap: 12, paddingBottom: 40 },

  summaryBar: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    flexDirection: 'row',
    padding: 16,
    marginBottom: 4,
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal: { fontSize: 15, fontWeight: '800', color: '#fff' },
  summaryValRed: { color: '#F87171' },
  summaryLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: { width: 1, height: 32, backgroundColor: '#334155' },

  histCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  histCardAnomaly: { borderColor: '#FEE2E2', backgroundColor: '#FFFBFB' },

  histCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  histCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },

  histIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  histIconBadgeBlue: { backgroundColor: '#EFF6FF' },
  histIconBadgeRed: { backgroundColor: '#FEF2F2' },

  histStation: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  histMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  histMetaText: { fontSize: 11, color: '#94A3B8' },
  histMetaDot: { color: '#CBD5E1', fontSize: 11 },

  anomalyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  anomalyBadgeText: { fontSize: 11, color: '#EF4444', fontWeight: '700' },
  okBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  okBadgeText: { fontSize: 11, color: '#10B981', fontWeight: '700' },

  histStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  histStat: { flex: 1, alignItems: 'center', gap: 2 },
  histStatVal: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
  histStatLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  histStatDivider: { width: 1, height: 28, backgroundColor: '#E2E8F0' },

  histFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  histPriceLabel: { fontSize: 11, color: '#94A3B8' },
  histPriceVal: { fontSize: 12, fontWeight: '700', color: '#475569' },

  anomalyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
  },
  anomalyNoteText: { flex: 1, fontSize: 11, color: '#EF4444', lineHeight: 16 },
});
