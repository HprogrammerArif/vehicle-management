import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { authApi } from '../src/services/api';
import { useMobileStore } from '../src/store/useMobileStore';
import { getMobileSocket } from '../src/services/socket';
import { useToast } from '../src/components/AppToast';

export default function LoginScreen() {
  const router = useRouter();
  const { setSession } = useMobileStore();
  const { showToast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please enter your Employee ID and password.',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(identifier.trim(), password);

      if (res?.success && res.token && res.user) {
        await setSession(res.token, {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          employeeId: res.user.employeeId,
          role: res.user.role,
          department: res.user.department,
          driverId: res.user.driverId,
          organization: res.user.organization,
        });

        // Connect to socket and announce presence
        const socket = getMobileSocket();
        socket.emit('user:online', {
          userId: res.user.id,
          name: res.user.name,
          role: res.user.role,
        });

        // Route by role
        if (res.user.role === 'DRIVER') {
          router.replace('/(driver)/active-trip');
        } else {
          router.replace('/(employee)/my-trips');
        }
      } else {
        showToast({
          type: 'error',
          title: 'Login Failed',
          message: res?.message || 'Invalid credentials. Please try again.',
        });
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not reach the server. Check your network.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>Apex VMS</Text>
          <Text style={styles.subtitle}>Enterprise Vehicle Management System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>
            Use your Employee ID or email assigned by your administrator
          </Text>

          <View style={styles.field}>
            <Text style={styles.label}>Employee ID or Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. EMP-001 or john@vms.com"
              placeholderTextColor="#94a3b8"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#64748B" />
                ) : (
                  <Eye size={18} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Contact your administrator if you don't have credentials
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BEDBFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#171717',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#525252',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#171717',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#525252',
    lineHeight: 18,
    marginTop: -8,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#525252',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#171717',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 52,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: 18,
  },
  btn: {
    backgroundColor: '#2B7FFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2B7FFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#878787',
    marginTop: 24,
    fontWeight: '500',
  },
});
