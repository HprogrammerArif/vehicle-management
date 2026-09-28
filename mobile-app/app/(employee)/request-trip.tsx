import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  MapPin,
  Flag,
  Calendar,
  ClipboardList,
  Users,
  X,
  AlertTriangle,
  ArrowRight,
  Repeat,
  RefreshCw,
} from 'lucide-react-native';
import { tripsApi, authApi } from '../../src/services/api';
import { useToast } from '../../src/components/AppToast';

const TRIP_TYPES = [
  { key: 'ONE_WAY', label: 'One Way', icon: ArrowRight },
  { key: 'ROUND_TRIP', label: 'Round Trip', icon: Repeat },
  { key: 'PICKUP_DROPOFF', label: 'Pickup & Drop-off', icon: RefreshCw },
];

interface Passenger {
  userId: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  phone: string;
}

export default function RequestTripScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Location fields
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  // Trip details
  const [purpose, setPurpose] = useState('');
  const [tripType, setTripType] = useState('ONE_WAY');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('08:00');

  // Passenger search
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Passenger | null>(null);
  const [searchError, setSearchError] = useState('');
  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const handleSearchEmployee = async () => {
    if (!searchId.trim()) return;
    setSearching(true);
    setSearchResult(null);
    setSearchError('');

    const res = await authApi.lookupEmployee(searchId.trim());
    setSearching(false);

    if (res.success && res.data) {
      // Don't allow adding yourself or duplicates
      const already = passengers.find((p) => p.employeeId === res.data.employeeId);
      if (already) {
        setSearchError('This colleague is already added.');
      } else {
        setSearchResult(res.data);
      }
    } else {
      setSearchError(res.message || 'No employee found with that ID.');
    }
  };

  const handleAddPassenger = () => {
    if (!searchResult) return;
    setPassengers((prev) => [...prev, searchResult]);
    setSearchResult(null);
    setSearchId('');
    setSearchError('');
  };

  const handleRemovePassenger = (employeeId: string) => {
    setPassengers((prev) => prev.filter((p) => p.employeeId !== employeeId));
  };

  const validate = () => {
    if (!pickupAddress.trim()) {
      showToast({ type: 'warning', title: 'Required', message: 'Enter pickup location.' });
      return false;
    }
    if (!dropoffAddress.trim()) {
      showToast({ type: 'warning', title: 'Required', message: 'Enter destination/dropoff location.' });
      return false;
    }
    if (!purpose.trim()) {
      showToast({ type: 'warning', title: 'Required', message: 'Enter the purpose of your trip.' });
      return false;
    }
    if (!departureDate.trim()) {
      showToast({ type: 'warning', title: 'Required', message: 'Enter departure date (DD/MM/YYYY).' });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    let departureAt: Date;
    try {
      let [day, month, year] = departureDate.split('/').map(Number);
      if (year < 100) year += 2000;
      const [hh, mm] = (departureTime || '08:00').split(':').map(Number);
      departureAt = new Date(year, month - 1, day, hh, mm);
      if (isNaN(departureAt.getTime())) throw new Error();
    } catch {
      showToast({ type: 'error', title: 'Invalid Date', message: 'Use format DD/MM/YYYY and time HH:MM' });
      return;
    }

    setSubmitting(true);
    const res = await tripsApi.createTrip({
      pickupAddress: pickupAddress.trim(),
      dropoffAddress: dropoffAddress.trim(),
      departureAt: departureAt.toISOString(),
      purpose,
      tripType,
      passengers: passengers.map((p) => ({
        userId: p.userId,
        employeeId: p.employeeId,
        name: p.name,
        email: p.email,
        department: p.department,
        phone: p.phone,
      })),
    });

    setSubmitting(false);
    if (res.success) {
      showToast({
        type: 'success',
        title: 'Requisition Submitted',
        message: 'Your vehicle request has been sent to the Fleet Manager for approval.',
      });
      router.replace('/(employee)/my-trips');
    } else {
      showToast({
        type: 'error',
        title: 'Error',
        message: res.message || 'Failed to submit. Please try again.',
      });
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        bottomOffset={40}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Request Corporate Vehicle</Text>
      <Text style={styles.subtitle}>Submit a vehicle requisition for admin approval</Text>

      {/* ── Pickup Location ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MapPin size={13} color="#2B7FFF" />
          <Text style={styles.sectionLabel}>PICKUP LOCATION</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter full pickup address (e.g. Gulshan-1, Dhaka)"
          placeholderTextColor="#94a3b8"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          multiline
        />
      </View>

      {/* ── Dropoff Location ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Flag size={13} color="#EF4444" />
          <Text style={styles.sectionLabel}>DESTINATION / DROPOFF</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter full destination (e.g. Karnaphuli EPZ, Chittagong)"
          placeholderTextColor="#94a3b8"
          value={dropoffAddress}
          onChangeText={setDropoffAddress}
          multiline
        />
      </View>

      {/* ── Trip Type ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TRIP TYPE</Text>
        <View style={styles.typeRow}>
          {TRIP_TYPES.map((t) => {
            const Icon = t.icon;
            const isSelected = tripType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeChip, isSelected && styles.typeChipSelected]}
                onPress={() => setTripType(t.key)}
              >
                <Icon size={14} color={isSelected ? '#2B7FFF' : '#525252'} style={{ marginRight: 6 }} />
                <Text style={[styles.typeChipText, isSelected && styles.typeChipTextSelected]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Date & Time ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={13} color="#525252" />
          <Text style={styles.sectionLabel}>DEPARTURE</Text>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#94a3b8"
              value={departureDate}
              onChangeText={setDepartureDate}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 0.65 }}>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor="#94a3b8"
              value={departureTime}
              onChangeText={setDepartureTime}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* ── Purpose ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ClipboardList size={13} color="#525252" />
          <Text style={styles.sectionLabel}>OFFICIAL PURPOSE *</Text>
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="e.g. Factory inspection and vendor meeting at Chattogram unit"
          placeholderTextColor="#94a3b8"
          value={purpose}
          onChangeText={setPurpose}
        />
      </View>

      {/* ── Passengers ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Users size={13} color="#525252" />
          <Text style={styles.sectionLabel}>ACCOMPANYING COLLEAGUES</Text>
        </View>
        <Text style={styles.sectionHint}>Search by Employee ID to add colleagues</Text>

        {/* Added passengers list */}
        {passengers.length > 0 && (
          <View style={styles.passengerList}>
            {passengers.map((p) => (
              <View key={p.employeeId} style={styles.passengerCard}>
                <View style={styles.passengerAvatar}>
                  <Text style={styles.passengerAvatarText}>{p.name[0]}</Text>
                </View>
                <View style={styles.passengerInfo}>
                  <Text style={styles.passengerName}>{p.name}</Text>
                  <Text style={styles.passengerMeta}>{p.employeeId} · {p.department || 'N/A'}</Text>
                  {p.phone ? <Text style={styles.passengerPhone}>{p.phone}</Text> : null}
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemovePassenger(p.employeeId)}
                >
                  <X size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Search input */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.searchInput]}
            placeholder="Enter Employee ID (e.g. EMP-109)"
            placeholderTextColor="#94a3b8"
            value={searchId}
            onChangeText={(t) => {
              setSearchId(t);
              setSearchResult(null);
              setSearchError('');
            }}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.searchBtn, searching && { opacity: 0.6 }]}
            onPress={handleSearchEmployee}
            disabled={searching || !searchId.trim()}
          >
            {searching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error message */}
        {searchError ? (
          <View style={styles.searchError}>
            <AlertTriangle size={13} color="#DC2626" style={{ marginRight: 4 }} />
            <Text style={styles.searchErrorText}>{searchError}</Text>
          </View>
        ) : null}

        {/* Search result preview */}
        {searchResult ? (
          <View style={styles.resultCard}>
            <View style={styles.resultLeft}>
              <View style={styles.resultAvatar}>
                <Text style={styles.resultAvatarText}>{searchResult.name[0]}</Text>
              </View>
              <View>
                <Text style={styles.resultName}>{searchResult.name}</Text>
                <Text style={styles.resultMeta}>
                  {searchResult.employeeId} · {searchResult.department || 'Employee'}
                </Text>
                {searchResult.email ? (
                  <Text style={styles.resultEmail}>{searchResult.email}</Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddPassenger}>
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* ── Submit ── */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit Requisition</Text>
        )}
      </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, gap: 20, paddingBottom: 50 },
  title: { fontSize: 22, fontWeight: '800', color: '#171717' },
  subtitle: { fontSize: 13, color: '#525252', marginBottom: 4, marginTop: -8 },

  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#525252',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  sectionHint: { fontSize: 11, color: '#878787', marginTop: -4 },

  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    color: '#171717',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },

  typeRow: { gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  typeChipSelected: { backgroundColor: '#EFF6FF', borderColor: '#2B7FFF' },
  typeChipText: { fontSize: 13, color: '#525252' },
  typeChipTextSelected: { color: '#2B7FFF', fontWeight: '700' },

  // Passenger list
  passengerList: { gap: 8 },
  passengerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, elevation: 1,
  },
  passengerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  passengerAvatarText: { color: '#2B7FFF', fontWeight: '800', fontSize: 16 },
  passengerInfo: { flex: 1, gap: 2 },
  passengerName: { fontSize: 14, fontWeight: '700', color: '#171717' },
  passengerMeta: { fontSize: 11, color: '#525252' },
  passengerPhone: { fontSize: 11, color: '#878787' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },
  removeText: { color: '#F14141', fontSize: 12, fontWeight: '700' },

  // Search
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1 },
  searchBtn: {
    backgroundColor: '#2B7FFF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  searchError: {
    backgroundColor: '#FEE2E2', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#FCA5A5',
  },
  searchErrorText: { color: '#F14141', fontSize: 12, fontWeight: '600' },

  resultCard: {
    backgroundColor: '#ffffff', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#BEDBFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#2B7FFF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, elevation: 2,
  },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  resultAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  resultAvatarText: { color: '#2B7FFF', fontWeight: '800', fontSize: 18 },
  resultName: { fontSize: 15, fontWeight: '700', color: '#171717' },
  resultMeta: { fontSize: 11, color: '#525252', marginTop: 2 },
  resultEmail: { fontSize: 11, color: '#878787', marginTop: 1 },
  addBtn: {
    backgroundColor: '#DCFCE7', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  addBtnText: { color: '#2F9B65', fontWeight: '700', fontSize: 13 },

  submitBtn: {
    backgroundColor: '#2B7FFF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#2B7FFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
