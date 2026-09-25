import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { tripsApi, authApi } from '../../src/services/api';

const TRIP_TYPES = [
  { key: 'ONE_WAY', label: '➡️ One Way' },
  { key: 'ROUND_TRIP', label: '🔄 Round Trip' },
  { key: 'PICKUP_DROPOFF', label: '🔁 Pickup & Drop-off' },
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
    if (!pickupAddress.trim()) { Alert.alert('Required', 'Enter pickup location.'); return false; }
    if (!dropoffAddress.trim()) { Alert.alert('Required', 'Enter destination/dropoff location.'); return false; }
    if (!purpose.trim()) { Alert.alert('Required', 'Enter the purpose of your trip.'); return false; }
    if (!departureDate.trim()) { Alert.alert('Required', 'Enter departure date (DD/MM/YYYY).'); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    let departureAt: Date;
    try {
      const [day, month, year] = departureDate.split('/').map(Number);
      const [hh, mm] = (departureTime || '08:00').split(':').map(Number);
      departureAt = new Date(year, month - 1, day, hh, mm);
      if (isNaN(departureAt.getTime())) throw new Error();
    } catch {
      Alert.alert('Invalid Date', 'Use format DD/MM/YYYY and time HH:MM');
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
      Alert.alert(
        '✅ Requisition Submitted',
        'Your vehicle request has been sent to the Fleet Manager for approval.',
        [{ text: 'View My Trips', onPress: () => router.replace('/(employee)/my-trips') }]
      );
    } else {
      Alert.alert('Error', res.message || 'Failed to submit. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Request Corporate Vehicle</Text>
      <Text style={styles.subtitle}>Submit a vehicle requisition for admin approval</Text>

      {/* ── Pickup Location ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>📍 PICKUP LOCATION</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter full pickup address (e.g. Gulshan-1, Dhaka)"
          placeholderTextColor="#475569"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          multiline
        />
      </View>

      {/* ── Dropoff Location ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🏁 DESTINATION / DROPOFF</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter full destination (e.g. Karnaphuli EPZ, Chittagong)"
          placeholderTextColor="#475569"
          value={dropoffAddress}
          onChangeText={setDropoffAddress}
          multiline
        />
      </View>

      {/* ── Trip Type ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TRIP TYPE</Text>
        <View style={styles.typeRow}>
          {TRIP_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeChip, tripType === t.key && styles.typeChipSelected]}
              onPress={() => setTripType(t.key)}
            >
              <Text style={[styles.typeChipText, tripType === t.key && styles.typeChipTextSelected]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Date & Time ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>🗓 DEPARTURE</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#475569"
              value={departureDate}
              onChangeText={setDepartureDate}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 0.65 }}>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor="#475569"
              value={departureTime}
              onChangeText={setDepartureTime}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* ── Purpose ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>📋 OFFICIAL PURPOSE *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="e.g. Factory inspection and vendor meeting at Chattogram unit"
          placeholderTextColor="#475569"
          value={purpose}
          onChangeText={setPurpose}
        />
      </View>

      {/* ── Passengers ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>👥 ACCOMPANYING COLLEAGUES</Text>
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
                  <Text style={styles.removeText}>✕</Text>
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
            placeholderTextColor="#475569"
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
            <Text style={styles.searchErrorText}>⚠️ {searchError}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 20, gap: 20, paddingBottom: 50 },
  title: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  subtitle: { fontSize: 12, color: '#64748b', marginBottom: 4, marginTop: -8 },

  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  sectionHint: { fontSize: 11, color: '#334155', marginTop: -4 },

  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },

  typeRow: { gap: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, backgroundColor: '#0f172a',
    borderWidth: 1, borderColor: '#1e293b',
  },
  typeChipSelected: { backgroundColor: '#1e1b4b', borderColor: '#4f46e5' },
  typeChipText: { fontSize: 13, color: '#64748b' },
  typeChipTextSelected: { color: '#a5b4fc', fontWeight: '700' },

  // Passenger list
  passengerList: { gap: 8 },
  passengerCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0c1520', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#1e3a5f', gap: 12,
  },
  passengerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1e3a5f', justifyContent: 'center', alignItems: 'center',
  },
  passengerAvatarText: { color: '#38bdf8', fontWeight: '800', fontSize: 16 },
  passengerInfo: { flex: 1, gap: 2 },
  passengerName: { fontSize: 14, fontWeight: '700', color: '#f8fafc' },
  passengerMeta: { fontSize: 11, color: '#64748b' },
  passengerPhone: { fontSize: 11, color: '#475569' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1c0a0a', justifyContent: 'center', alignItems: 'center',
  },
  removeText: { color: '#f87171', fontSize: 12, fontWeight: '700' },

  // Search
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  searchInput: { flex: 1 },
  searchBtn: {
    backgroundColor: '#1e40af', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  searchError: {
    backgroundColor: '#1c0a0a', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#7f1d1d',
  },
  searchErrorText: { color: '#f87171', fontSize: 12 },

  resultCard: {
    backgroundColor: '#0a1628', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#1d4ed8',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  resultLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  resultAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1e3a8a', justifyContent: 'center', alignItems: 'center',
  },
  resultAvatarText: { color: '#60a5fa', fontWeight: '800', fontSize: 18 },
  resultName: { fontSize: 15, fontWeight: '700', color: '#f8fafc' },
  resultMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  resultEmail: { fontSize: 11, color: '#475569', marginTop: 1 },
  addBtn: {
    backgroundColor: '#166534', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: '#4ade80', fontWeight: '700', fontSize: 13 },

  submitBtn: {
    backgroundColor: '#4f46e5', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
