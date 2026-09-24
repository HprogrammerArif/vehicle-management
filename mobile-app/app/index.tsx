import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileStore, DEFAULT_EMPLOYEE, DEFAULT_DRIVER } from '../src/store/useMobileStore';
import { authApi } from '../src/services/api';
import { getMobileSocket } from '../src/services/socket';

export default function IndexScreen() {
  const router = useRouter();
  const { setRole, setUser, setToken } = useMobileStore();
  const [loadingRole, setLoadingRole] = useState<'EMPLOYEE' | 'DRIVER' | null>(null);

  const handleSelectRole = async (selectedRole: 'EMPLOYEE' | 'DRIVER') => {
    setLoadingRole(selectedRole);
    setRole(selectedRole);

    try {
      // Auto-authenticate as the default demo employee or driver
      const email = selectedRole === 'EMPLOYEE' ? 'john.doe@vms.com' : 'driver.rahim@vms.com';
      const password = selectedRole === 'EMPLOYEE' ? 'password123' : 'driver123';

      const res = await authApi.login(email, password);
      if (res?.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);

        // Identify online presence to socket server
        const socket = getMobileSocket();
        socket.emit('user:online', {
          userId: res.user.id,
          name: res.user.name,
          role: selectedRole,
        });
      } else {
        // Fallback to seeded default profile
        setUser(selectedRole === 'EMPLOYEE' ? DEFAULT_EMPLOYEE : DEFAULT_DRIVER);
      }
    } catch (err) {
      console.warn('Auto-login failed, using fallback profile:', err);
      setUser(selectedRole === 'EMPLOYEE' ? DEFAULT_EMPLOYEE : DEFAULT_DRIVER);
    } finally {
      setLoadingRole(null);
      if (selectedRole === 'EMPLOYEE') {
        router.push('/(employee)/request-trip');
      } else {
        router.push('/(driver)/active-trip');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.title}>Apex VMS</Text>
        <Text style={styles.subtitle}>Enterprise Transit & Driver Telemetry</Text>
      </View>

      <View style={styles.cardContainer}>
        <Text style={styles.sectionTitle}>Select Your Role</Text>

        <TouchableOpacity
          style={styles.roleCard}
          onPress={() => handleSelectRole('EMPLOYEE')}
          activeOpacity={0.8}
          disabled={loadingRole !== null}
        >
          <Text style={styles.roleIcon}>👤</Text>
          <View style={styles.roleTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.roleTitle}>Employee Portal</Text>
              {loadingRole === 'EMPLOYEE' && <ActivityIndicator size="small" color="#6366f1" />}
            </View>
            <Text style={styles.roleDesc}>
              Request corporate transport, choose office routes, add colleagues
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, styles.driverCard]}
          onPress={() => handleSelectRole('DRIVER')}
          activeOpacity={0.8}
          disabled={loadingRole !== null}
        >
          <Text style={styles.roleIcon}>🏎️</Text>
          <View style={styles.roleTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.roleTitle}>Driver Console</Text>
              {loadingRole === 'DRIVER' && <ActivityIndicator size="small" color="#818cf8" />}
            </View>
            <Text style={styles.roleDesc}>
              Stream live GPS coordinates, manage missions, upload fuel receipts
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Connected to Apex Corporate Telemetry Server</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoBadge: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  cardContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  roleCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  driverCard: {
    borderColor: '#312e81',
  },
  roleIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  roleDesc: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#475569',
    marginBottom: 20,
  },
});
