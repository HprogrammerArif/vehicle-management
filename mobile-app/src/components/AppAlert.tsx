import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  LogOut,
  XCircle,
} from 'lucide-react-native';

export type AlertModalType = 'danger' | 'warning' | 'info' | 'success';

export interface AlertModalOptions {
  title: string;
  message: string;
  type?: AlertModalType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface AlertContextValue {
  showAlert: (opts: AlertModalOptions) => void;
  showConfirm: (opts: AlertModalOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue>({
  showAlert: () => {},
  showConfirm: () => {},
  hideAlert: () => {},
});

export function useAppAlert() {
  return useContext(AlertContext);
}

const TYPE_CONFIG = {
  danger: {
    icon: XCircle,
    color: '#DC2626',
    bg: '#FEE2E2',
    btnBg: '#DC2626',
    btnText: '#FFFFFF',
  },
  warning: {
    icon: AlertTriangle,
    color: '#D97706',
    bg: '#FEF3C7',
    btnBg: '#D97706',
    btnText: '#FFFFFF',
  },
  info: {
    icon: Info,
    color: '#2563EB',
    bg: '#DBEAFE',
    btnBg: '#2563EB',
    btnText: '#FFFFFF',
  },
  success: {
    icon: CheckCircle,
    color: '#16A34A',
    bg: '#DCFCE7',
    btnBg: '#16A34A',
    btnText: '#FFFFFF',
  },
};

export function AlertModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<AlertModalOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 250,
      }),
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleValue, opacityValue]);

  const animateOut = useCallback((cb?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setModalState(null);
      setLoading(false);
      cb?.();
    });
  }, [scaleValue, opacityValue]);

  const showAlert = useCallback(
    (opts: AlertModalOptions) => {
      setModalState({ ...opts, showCancel: false, confirmText: opts.confirmText || 'OK' });
      setVisible(true);
      animateIn();
    },
    [animateIn]
  );

  const showConfirm = useCallback(
    (opts: AlertModalOptions) => {
      setModalState({
        ...opts,
        showCancel: true,
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
      });
      setVisible(true);
      animateIn();
    },
    [animateIn]
  );

  const hideAlert = useCallback(() => {
    animateOut();
  }, [animateOut]);

  const handleConfirm = async () => {
    if (!modalState) return;
    if (modalState.onConfirm) {
      try {
        setLoading(true);
        await modalState.onConfirm();
      } finally {
        setLoading(false);
      }
    }
    animateOut();
  };

  const handleCancel = () => {
    if (modalState?.onCancel) {
      modalState.onCancel();
    }
    animateOut();
  };

  const currentType = modalState?.type || 'info';
  const config = TYPE_CONFIG[currentType];
  const IconComponent = config.icon;

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleCancel}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: opacityValue },
            ]}
          />
          <Animated.View
            style={[
              styles.card,
              {
                opacity: opacityValue,
                transform: [{ scale: scaleValue }],
              },
            ]}
          >
            <View style={[styles.iconBadge, { backgroundColor: config.bg }]}>
              <IconComponent size={28} color={config.color} />
            </View>

            <Text style={styles.title}>{modalState?.title}</Text>
            <Text style={styles.message}>{modalState?.message}</Text>

            <View style={styles.btnRow}>
              {modalState?.showCancel && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  disabled={loading}
                >
                  <Text style={styles.cancelBtnText}>{modalState.cancelText || 'Cancel'}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  { backgroundColor: config.btnBg },
                  !modalState?.showCancel && { flex: 1 },
                  loading && { opacity: 0.7 },
                ]}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: config.btnText }]}>
                    {modalState?.confirmText || 'OK'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
