/**
 * AppToast — Global animated toast notification system
 *
 * Usage:
 *   1. Wrap your root with <ToastProvider>
 *   2. In any component: const { showToast } = useToast();
 *      showToast({ type: 'success', title: 'Done!', message: 'Optional subtitle' });
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react-native';

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
}

// Variant config
const VARIANTS: Record<ToastType, { bg: string; border: string; iconColor: string; titleColor: string }> = {
  success: { bg: '#F0FDF4', border: '#86EFAC', iconColor: '#16A34A', titleColor: '#15803D' },
  error:   { bg: '#FFF1F2', border: '#FCA5A5', iconColor: '#DC2626', titleColor: '#B91C1C' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', iconColor: '#D97706', titleColor: '#B45309' },
  info:    { bg: '#EFF6FF', border: '#93C5FD', iconColor: '#2563EB', titleColor: '#1D4ED8' },
};

function ToastIcon({ type, color }: { type: ToastType; color: string }) {
  const size = 20;
  switch (type) {
    case 'success':  return <CheckCircle   size={size} color={color} />;
    case 'error':    return <XCircle       size={size} color={color} />;
    case 'warning':  return <AlertTriangle size={size} color={color} />;
    default:         return <Info          size={size} color={color} />;
  }
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

interface ToastState extends ToastOptions {
  id: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (opts: ToastOptions) => {
      const id = ++counterRef.current;
      setToasts((prev) => [...prev, { ...opts, id }]);
      setTimeout(() => removeToast(id), opts.duration ?? 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const v = VARIANTS[toast.type];
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -80, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  return (
    <Animated.View style={[styles.toast, { backgroundColor: v.bg, borderColor: v.border, transform: [{ translateY }], opacity }]}>
      <View style={[styles.iconWrap, { backgroundColor: v.iconColor + '22' }]}>
        <ToastIcon type={toast.type} color={v.iconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: v.titleColor }]} numberOfLines={1}>{toast.title}</Text>
        {toast.message ? <Text style={styles.message} numberOfLines={2}>{toast.message}</Text> : null}
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X size={14} color="#94A3B8" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  textWrap: { flex: 1, gap: 1 },
  title:   { fontSize: 13, fontWeight: '700' },
  message: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  closeBtn: { flexShrink: 0, padding: 2 },
});
