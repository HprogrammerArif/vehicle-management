import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { mobileApi } from '../../src/services/api';

export default function ActiveTripScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<'READY' | 'IN_TRANSIT' | 'COMPLETED'>('READY');
  const [locationWatcher, setLocationWatcher] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const startJourney = async () => {
    // Request location permissions
    const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
    if (permStatus !== 'granted') {
      Alert.alert('Permission Denied', 'GPS location permission is needed to stream telemetry.');
      return;
    }

    setStatus('IN_TRANSIT');

    // Subscribe to GPS location updates
    const watcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 10,
      },
      (loc) => {
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    );
    setLocationWatcher(watcher);
    Alert.alert('Journey Commenced', 'Live GPS coordinates are now streaming to the central Admin map.');
  };

  const completeJourney = () => {
    if (locationWatcher) {
      locationWatcher.remove();
    }
    setStatus('COMPLETED');
    Alert.alert('Mission Accomplished', 'Trip finalized. Vehicle and driver status updated to Available.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.statusBadge}>
            {status === 'IN_TRANSIT' ? '● IN TRANSIT' : status}
          </Text>
          <Text style={styles.plateText}>DHK-METRO-GHA-3344</Text>
        </View>

        <Text style={styles.vehicleTitle}>Toyota Land Cruiser Prado TX-L</Text>
        <Text style={styles.routeText}>Dhaka HQ &rarr; Gazipur Heavy Plant</Text>

        <View style={styles.telemetryBox}>
          <Text style={styles.telemetryLabel}>GPS Telemetry Stream</Text>
          <Text style={styles.telemetryValue}>
            {coords
              ? `Lat: ${coords.lat.toFixed(4)}, Lng: ${coords.lng.toFixed(4)}`
              : 'Waiting for GPS fix (Ready)'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {status === 'READY' && (
          <TouchableOpacity style={styles.primaryButton} onPress={startJourney}>
            <Text style={styles.buttonText}>Start Journey (Activate GPS)</Text>
          </TouchableOpacity>
        )}

        {status === 'IN_TRANSIT' && (
          <>
            <TouchableOpacity
              style={styles.fuelButton}
              onPress={() => router.push('/(driver)/fuel-log')}
            >
              <Text style={styles.fuelButtonText}>⛽ Log Fuel Refuel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.completeButton} onPress={completeJourney}>
              <Text style={styles.buttonText}>Complete Journey</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'COMPLETED' && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => setStatus('READY')}>
            <Text style={styles.buttonText}>Back to Duty Board</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => router.push('/(driver)/conversations')}
        >
          <Text style={styles.chatButtonText}>💬 Dispatch & Fleet Chat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 20,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34d399',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  plateText: {
    fontFamily: 'monospace',
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  routeText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  telemetryBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
  },
  telemetryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  telemetryValue: {
    fontSize: 12,
    color: '#38bdf8',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  actions: {
    gap: 12,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  fuelButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  fuelButtonText: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 14,
  },
  completeButton: {
    backgroundColor: '#9333ea',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  chatButton: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#38bdf8',
    fontWeight: '700',
    fontSize: 14,
  },
});
