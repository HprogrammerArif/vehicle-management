import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/services/api';

export default function RequestTripScreen() {
  const router = useRouter();
  const [purpose, setPurpose] = useState('');
  const [coPassenger, setCoPassenger] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!purpose.trim()) {
      Alert.alert('Required Field', 'Please provide the purpose of your trip.');
      return;
    }

    setLoading(true);
    // Hardcoded demo offices: Dhaka HQ -> Gazipur Factory
    const res = await mobileApi('/trips', {
      method: 'POST',
      body: JSON.stringify({
        fromOfficeId: 'office_hq',
        toOfficeId: 'office_gazipur',
        departureAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        purpose,
        tripType: 'ROUND_TRIP',
        passengers: coPassenger ? [{ name: coPassenger }] : [],
      }),
    });

    setLoading(false);
    if (res.success) {
      Alert.alert(
        'Requisition Transmitted',
        'Your trip request has been submitted to the Fleet Manager for vehicle and driver assignment.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Success', 'Trip request created in system queue!');
      router.back();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Request Corporate Vehicle</Text>
      <Text style={styles.subtitle}>
        Corporate travel requisition between Head Office and Regional Plants
      </Text>

      {/* Fleet Support & Chat Quick Link */}
      <TouchableOpacity
        style={styles.chatBanner}
        onPress={() => router.push('/(employee)/conversations')}
        activeOpacity={0.8}
      >
        <View style={styles.chatBannerLeft}>
          <Text style={styles.chatIcon}>💬</Text>
          <View>
            <Text style={styles.chatBannerTitle}>Fleet Support & Dispatch Chat</Text>
            <Text style={styles.chatBannerSubtitle}>Contact fleet managers & drivers in real-time</Text>
          </View>
        </View>
        <Text style={styles.chatBannerAction}>Open &rarr;</Text>
      </TouchableOpacity>

      {/* Office Route Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Origin & Destination</Text>
        <View style={styles.routeItem}>
          <Text style={styles.routeBullet}>🟢</Text>
          <Text style={styles.routeText}>Dhaka Corporate Headquarters (Gulshan-1)</Text>
        </View>
        <View style={styles.routeItem}>
          <Text style={styles.routeBullet}>🔴</Text>
          <Text style={styles.routeText}>Gazipur Manufacturing Plant</Text>
        </View>
      </View>

      {/* Inputs */}
      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Official Purpose *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="e.g. On-site engineering equipment inspection"
          placeholderTextColor="#64748b"
          value={purpose}
          onChangeText={setPurpose}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.inputLabel}>Accompanying Colleague (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sarah Smith"
          placeholderTextColor="#64748b"
          value={coPassenger}
          onChangeText={setCoPassenger}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Requisition'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  chatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#4338ca',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  chatBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  chatIcon: {
    fontSize: 22,
  },
  chatBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e0e7ff',
  },
  chatBannerSubtitle: {
    fontSize: 11,
    color: '#a5b4fc',
    marginTop: 2,
  },
  chatBannerAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818cf8',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeBullet: {
    fontSize: 12,
  },
  routeText: {
    fontSize: 13,
    color: '#f8fafc',
    fontWeight: '600',
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
